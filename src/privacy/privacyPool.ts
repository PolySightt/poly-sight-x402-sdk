import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import * as crypto from 'crypto';
import {
  PrivacyPoolConfig,
  PrivateBetCommitment,
  ShieldedTransaction,
  NullifierSet,
  PrivacyStats,
} from './types';
import { ZKProofGenerator } from './zkproof';
import { PrivacyEncryption } from './encryption';

/**
 * Privacy Pool Manager
 * Implements mixing pool for anonymous transactions
 */
export class PrivacyPool {
  private connection: Connection;
  private config: PrivacyPoolConfig;
  private zkGenerator: ZKProofGenerator;
  private commitments: Set<string>;
  private nullifiers: NullifierSet;
  private merkleTree: MerkleTree;
  private stats: PrivacyStats;

  constructor(connection: Connection, config: PrivacyPoolConfig) {
    this.connection = connection;
    this.config = config;
    
    this.zkGenerator = new ZKProofGenerator(
      {
        circuitType: 'groth16',
        hideAmount: true,
        hideAddress: true,
      },
      'poseidon'
    );

    this.commitments = new Set<string>();
    this.nullifiers = {
      nullifiers: new Set<string>(),
      lastUpdate: Date.now(),
    };
    
    this.merkleTree = new MerkleTree(config.merkleTreeDepth);
    
    this.stats = {
      totalPrivateTxs: 0,
      totalShieldedAmount: new BN(0),
      avgAnonymitySet: 0,
      avgProofTime: 0,
      verificationRate: 1.0,
    };
  }

  /**
   * Deposit funds into privacy pool (shield)
   * @param amount - Amount to deposit
   * @param depositor - Depositor keypair
   * @returns Private commitment
   */
  async deposit(
    amount: BN,
    depositor: Keypair
  ): Promise<PrivateBetCommitment> {
    // Verify amount matches denomination
    if (!amount.eq(this.config.denomination)) {
      throw new Error(
        `Amount must match denomination: ${this.config.denomination.toString()}`
      );
    }

    // Generate secret and nullifier
    const secret = ZKProofGenerator.generateSecret();
    const nullifier = ZKProofGenerator.generateNullifier();

    // Generate commitment
    const commitment = await this.zkGenerator.generateCommitment({
      amount,
      secret,
      nullifier,
    });

    // Generate ZK-Proof of valid deposit
    const proof = await this.zkGenerator.generateProof(
      {
        amount,
        secret,
        nullifier,
      },
      [this.merkleTree.getRoot()]
    );

    // Encrypt bet details
    const betData = JSON.stringify({
      amount: amount.toString(),
      depositor: depositor.publicKey.toBase58(),
      timestamp: Date.now(),
    });
    
    const encryptionKey = PrivacyEncryption.generateKey();
    const encryptedData = PrivacyEncryption.encryptChaCha20(
      new Uint8Array(Buffer.from(betData)),
      encryptionKey
    );

    // Add commitment to merkle tree
    this.merkleTree.insert(commitment);
    this.commitments.add(Buffer.from(commitment).toString('hex'));

    // Update stats
    this.stats.totalPrivateTxs++;
    this.stats.totalShieldedAmount = this.stats.totalShieldedAmount.add(amount);
    this.updateAnonymitySet();

    const privateBet: PrivateBetCommitment = {
      commitment,
      nullifier,
      proof,
      encryptedData: encryptedData.ciphertext,
      marketId: 'privacy-pool',
      timestamp: Date.now(),
    };

    // Store secret and nullifier securely (user should backup)
    this.storeUserSecrets(depositor.publicKey, {
      secret,
      nullifier,
      commitment,
      encryptionKey,
    });

    return privateBet;
  }

  /**
   * Withdraw funds from privacy pool (unshield)
   * @param commitment - Original commitment
   * @param secret - User's secret
   * @param nullifier - User's nullifier
   * @param recipient - Withdrawal recipient
   * @returns Shielded transaction
   */
  async withdraw(
    commitment: Uint8Array,
    secret: Uint8Array,
    nullifier: Uint8Array,
    recipient: PublicKey
  ): Promise<ShieldedTransaction> {
    // Verify commitment exists in pool
    const commitmentHex = Buffer.from(commitment).toString('hex');
    if (!this.commitments.has(commitmentHex)) {
      throw new Error('Commitment not found in pool');
    }

    // Verify nullifier hasn't been used (prevent double-spend)
    const nullifierHex = Buffer.from(nullifier).toString('hex');
    if (this.nullifiers.nullifiers.has(nullifierHex)) {
      throw new Error('Nullifier already used (double-spend attempt)');
    }

    // Get merkle proof
    const merkleProof = this.merkleTree.getProof(commitment);
    const merkleRoot = this.merkleTree.getRoot();

    // Generate ZK-Proof of valid withdrawal
    const proof = await this.zkGenerator.generateProof(
      {
        amount: this.config.denomination,
        secret,
        nullifier,
      },
      [merkleRoot, recipient.toBase58()]
    );

    // Verify proof before proceeding
    const verification = await this.zkGenerator.verifyProof(proof);
    if (!verification.valid) {
      throw new Error(`Invalid withdrawal proof: ${verification.error}`);
    }

    // Mark nullifier as used
    this.nullifiers.nullifiers.add(nullifierHex);
    this.nullifiers.lastUpdate = Date.now();

    // Create shielded transaction
    const shieldedTx: ShieldedTransaction = {
      inputs: [nullifier],
      outputs: [commitment],
      proof,
      publicAmount: this.config.denomination,
      fee: new BN(5000), // 5000 lamports fee
    };

    // Update stats
    this.stats.totalPrivateTxs++;
    this.updateVerificationRate(verification.valid);

    return shieldedTx;
  }

  /**
   * Transfer within privacy pool (fully private)
   * @param senderCommitment - Sender's commitment
   * @param senderSecret - Sender's secret
   * @param senderNullifier - Sender's nullifier
   * @param recipientPubKey - Recipient's public key
   * @returns New commitment for recipient
   */
  async privateTransfer(
    senderCommitment: Uint8Array,
    senderSecret: Uint8Array,
    senderNullifier: Uint8Array,
    recipientPubKey: PublicKey
  ): Promise<PrivateBetCommitment> {
    // Verify sender's commitment
    const commitmentHex = Buffer.from(senderCommitment).toString('hex');
    if (!this.commitments.has(commitmentHex)) {
      throw new Error('Sender commitment not found');
    }

    // Verify nullifier not used
    const nullifierHex = Buffer.from(senderNullifier).toString('hex');
    if (this.nullifiers.nullifiers.has(nullifierHex)) {
      throw new Error('Nullifier already used');
    }

    // Generate new commitment for recipient
    const newSecret = ZKProofGenerator.generateSecret();
    const newNullifier = ZKProofGenerator.generateNullifier();

    const newCommitment = await this.zkGenerator.generateCommitment({
      amount: this.config.denomination,
      secret: newSecret,
      nullifier: newNullifier,
    });

    // Generate ZK-Proof of valid transfer
    const merkleRoot = this.merkleTree.getRoot();
    const proof = await this.zkGenerator.generateProof(
      {
        amount: this.config.denomination,
        secret: senderSecret,
        nullifier: senderNullifier,
      },
      [merkleRoot, Buffer.from(newCommitment).toString('hex')]
    );

    // Mark sender's nullifier as used
    this.nullifiers.nullifiers.add(nullifierHex);

    // Add new commitment to tree
    this.merkleTree.insert(newCommitment);
    this.commitments.add(Buffer.from(newCommitment).toString('hex'));

    // Encrypt transfer details for recipient
    const transferData = JSON.stringify({
      amount: this.config.denomination.toString(),
      from: 'anonymous',
      to: recipientPubKey.toBase58(),
      timestamp: Date.now(),
    });

    const encryptedData = PrivacyEncryption.encryptWithPublicKey(
      new Uint8Array(Buffer.from(transferData)),
      recipientPubKey
    );

    // Store recipient's secrets
    this.storeUserSecrets(recipientPubKey, {
      secret: newSecret,
      nullifier: newNullifier,
      commitment: newCommitment,
    });

    return {
      commitment: newCommitment,
      nullifier: newNullifier,
      proof,
      encryptedData: encryptedData.ciphertext,
      marketId: 'privacy-pool-transfer',
      timestamp: Date.now(),
    };
  }

  /**
   * Get current anonymity set size
   */
  getAnonymitySetSize(): number {
    return this.commitments.size;
  }

  /**
   * Check if pool has minimum anonymity
   */
  hasMinimumAnonymity(): boolean {
    return this.commitments.size >= this.config.minPoolSize;
  }

  /**
   * Get privacy statistics
   */
  getStats(): PrivacyStats {
    return { ...this.stats };
  }

  /**
   * Get merkle root
   */
  getMerkleRoot(): string {
    return this.merkleTree.getRoot();
  }

  /**
   * Verify commitment exists in pool
   */
  hasCommitment(commitment: Uint8Array): boolean {
    const commitmentHex = Buffer.from(commitment).toString('hex');
    return this.commitments.has(commitmentHex);
  }

  /**
   * Check if nullifier is used
   */
  isNullifierUsed(nullifier: Uint8Array): boolean {
    const nullifierHex = Buffer.from(nullifier).toString('hex');
    return this.nullifiers.nullifiers.has(nullifierHex);
  }

  /**
   * Store user secrets securely (in production, use encrypted storage)
   */
  private storeUserSecrets(
    user: PublicKey,
    secrets: Record<string, Uint8Array>
  ): void {
    // In production, encrypt and store in secure storage
    // For now, this is a placeholder
    console.log(`Secrets stored for user: ${user.toBase58()}`);
  }

  /**
   * Update anonymity set statistics
   */
  private updateAnonymitySet(): void {
    this.stats.avgAnonymitySet = this.commitments.size;
  }

  /**
   * Update verification rate
   */
  private updateVerificationRate(success: boolean): void {
    const total = this.stats.totalPrivateTxs;
    const currentRate = this.stats.verificationRate;
    
    if (success) {
      this.stats.verificationRate = (currentRate * (total - 1) + 1) / total;
    } else {
      this.stats.verificationRate = (currentRate * (total - 1)) / total;
    }
  }
}

/**
 * Merkle Tree implementation for privacy pool
 */
class MerkleTree {
  private depth: number;
  private leaves: Uint8Array[];
  private tree: Map<string, Uint8Array>;

  constructor(depth: number) {
    this.depth = depth;
    this.leaves = [];
    this.tree = new Map();
  }

  /**
   * Insert leaf into merkle tree
   */
  insert(leaf: Uint8Array): void {
    this.leaves.push(leaf);
    this.rebuildTree();
  }

  /**
   * Get merkle root
   */
  getRoot(): string {
    if (this.leaves.length === 0) {
      return this.hashPair(new Uint8Array(32), new Uint8Array(32));
    }
    return this.tree.get('root') 
      ? Buffer.from(this.tree.get('root')!).toString('hex')
      : '';
  }

  /**
   * Get merkle proof for leaf
   */
  getProof(leaf: Uint8Array): Uint8Array[] {
    const proof: Uint8Array[] = [];
    const leafHex = Buffer.from(leaf).toString('hex');
    
    let index = this.leaves.findIndex(
      l => Buffer.from(l).toString('hex') === leafHex
    );
    
    if (index === -1) {
      throw new Error('Leaf not found in tree');
    }

    // Build proof path
    for (let level = 0; level < this.depth; level++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      
      if (siblingIndex < this.leaves.length) {
        proof.push(this.leaves[siblingIndex]);
      } else {
        proof.push(new Uint8Array(32)); // Empty node
      }
      
      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * Rebuild merkle tree
   */
  private rebuildTree(): void {
    if (this.leaves.length === 0) return;

    let currentLevel = [...this.leaves];
    
    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length 
          ? currentLevel[i + 1]
          : new Uint8Array(32);
        
        const parent = this.hash(left, right);
        nextLevel.push(parent);
      }
      
      currentLevel = nextLevel;
    }

    this.tree.set('root', currentLevel[0]);
  }

  /**
   * Hash two nodes
   */
  private hash(left: Uint8Array, right: Uint8Array): Uint8Array {
    const combined = Buffer.concat([Buffer.from(left), Buffer.from(right)]);
    const hash = crypto.createHash('sha256').update(combined).digest();
    return new Uint8Array(hash);
  }

  /**
   * Hash pair and return hex string
   */
  private hashPair(left: Uint8Array, right: Uint8Array): string {
    return Buffer.from(this.hash(left, right)).toString('hex');
  }
}
