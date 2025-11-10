import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PolySightX402Client } from '../x402/client';
import { ZKProofGenerator } from './zkproof';
import { PrivacyPool } from './privacyPool';
import { PrivacyEncryption } from './encryption';
import {
  ZKProofConfig,
  PrivacyLevel,
  PrivateBetCommitment,
  PrivatePaymentProof,
  PrivacyPoolConfig,
  PrivacyStats,
  ShieldedTransaction,
} from './types';
import { Outcome, TransactionResult } from '../types';
import { X402PaymentResponse } from '../x402/types';

/**
 * PolySight Privacy Client
 * Extends X402 client with zero-knowledge proof privacy features
 */
export class PolySightPrivacyClient extends PolySightX402Client {
  private zkGenerator: ZKProofGenerator;
  private privacyPool?: PrivacyPool;
  private privacyLevel: PrivacyLevel;
  private userSecrets: Map<string, { secret: Uint8Array; nullifier: Uint8Array }>;

  constructor(
    connection: Connection,
    zkConfig?: ZKProofConfig,
    privacyPoolConfig?: PrivacyPoolConfig,
    config?: any
  ) {
    super(connection, undefined, config);

    // Initialize ZK-Proof generator
    this.zkGenerator = new ZKProofGenerator(
      zkConfig || {
        circuitType: 'groth16',
        hideAmount: true,
        hideAddress: true,
        hideOutcome: true,
      },
      'poseidon'
    );

    // Initialize privacy pool if config provided
    if (privacyPoolConfig) {
      this.privacyPool = new PrivacyPool(connection, privacyPoolConfig);
    }

    // Default privacy level
    this.privacyLevel = {
      level: 'high',
      hideAmount: true,
      hideSender: true,
      hideReceiver: false,
      useMixing: true,
      minAnonymitySet: 10,
      commitmentScheme: 'poseidon',
    };

    this.userSecrets = new Map();
  }

  /**
   * Set privacy level
   * @param level - Privacy level configuration
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.privacyLevel = level;
    
    // Update ZK generator config based on privacy level
    this.zkGenerator = new ZKProofGenerator(
      {
        circuitType: 'groth16',
        hideAmount: level.hideAmount,
        hideAddress: level.hideSender || level.hideReceiver,
      },
      level.commitmentScheme
    );
  }

  /**
   * Place a private bet with ZK-proof
   * @param marketId - Market identifier
   * @param outcome - Bet outcome
   * @param amount - Bet amount
   * @param user - User keypair
   * @returns Transaction result with privacy proof
   */
  async placePrivateBet(
    marketId: string,
    outcome: Outcome,
    amount: number | BN,
    user: Keypair
  ): Promise<
    TransactionResult & {
      privateBet?: PrivateBetCommitment;
      paymentProof?: PrivatePaymentProof;
    }
  > {
    const betAmount = typeof amount === 'number' ? new BN(amount * 1e9) : amount;

    // Generate user secrets if not exists
    let userSecret = this.getUserSecret(user.publicKey);
    if (!userSecret) {
      userSecret = {
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };
      this.userSecrets.set(user.publicKey.toBase58(), userSecret);
    }

    // Create private bet commitment
    const commitment = await this.zkGenerator.generateCommitment({
      amount: betAmount,
      secret: userSecret.secret,
      nullifier: userSecret.nullifier,
      metadata: {
        marketId,
        outcome,
        timestamp: Date.now(),
      },
    });

    // Generate ZK-Proof
    const proof = await this.zkGenerator.generateProof(
      {
        amount: betAmount,
        secret: userSecret.secret,
        nullifier: userSecret.nullifier,
      },
      [marketId, outcome.toString()]
    );

    // Encrypt bet details based on privacy level
    let encryptedData: Uint8Array;
    if (this.privacyLevel.hideAmount) {
      const betData = JSON.stringify({
        marketId,
        outcome,
        amount: betAmount.toString(),
        user: user.publicKey.toBase58(),
        timestamp: Date.now(),
      });
      
      const encryptionKey = PrivacyEncryption.generateKey();
      const encrypted = PrivacyEncryption.encryptChaCha20(
        new Uint8Array(Buffer.from(betData)),
        encryptionKey
      );
      encryptedData = encrypted.ciphertext;
    } else {
      encryptedData = new Uint8Array(0);
    }

    const privateBet: PrivateBetCommitment = {
      commitment,
      nullifier: userSecret.nullifier,
      proof,
      encryptedData,
      marketId,
      timestamp: Date.now(),
    };

    // If using privacy pool, deposit to pool first
    if (this.privacyLevel.useMixing && this.privacyPool) {
      await this.depositToPrivacyPool(betAmount, user);
    }

    // Place the actual bet (with privacy proof attached)
    const result = await this.placeBet(marketId, outcome, amount, user);

    return {
      ...result,
      privateBet,
    };
  }

  /**
   * Create private payment with ZK-proof
   * @param amount - Payment amount
   * @param recipient - Payment recipient
   * @param payer - Payer keypair
   * @returns Private payment proof
   */
  async createPrivatePayment(
    amount: BN,
    recipient: PublicKey,
    payer: Keypair
  ): Promise<PrivatePaymentProof> {
    // Generate payment secrets
    const secret = ZKProofGenerator.generateSecret();
    const nullifier = ZKProofGenerator.generateNullifier();

    // Create commitment
    const commitment = await this.zkGenerator.generateCommitment({
      amount,
      secret,
      nullifier,
    });

    // Generate ZK-Proof of payment
    const proof = await this.zkGenerator.generateProof(
      {
        amount,
        secret,
        nullifier,
      },
      [recipient.toBase58()]
    );

    // Encrypt amount if privacy level requires
    const encryptionKey = PrivacyEncryption.generateKey();
    const encryptedAmount = PrivacyEncryption.encryptAmount(
      amount.toString(),
      encryptionKey
    );

    // Get merkle proof if using privacy pool
    let merkleRoot: Uint8Array | undefined;
    let merklePath: Uint8Array[] | undefined;
    
    if (this.privacyPool) {
      merkleRoot = Buffer.from(this.privacyPool.getMerkleRoot(), 'hex');
      // In production, get actual merkle path
      merklePath = [];
    }

    return {
      proof,
      commitment,
      nullifier,
      encryptedAmount: encryptedAmount.ciphertext,
      recipient: this.privacyLevel.hideReceiver ? undefined : recipient,
      merkleRoot,
      merklePath,
    };
  }

  /**
   * Deposit to privacy pool for mixing
   * @param amount - Amount to deposit
   * @param depositor - Depositor keypair
   * @returns Private commitment
   */
  async depositToPrivacyPool(
    amount: BN,
    depositor: Keypair
  ): Promise<PrivateBetCommitment> {
    if (!this.privacyPool) {
      throw new Error('Privacy pool not initialized');
    }

    // Check minimum anonymity set
    if (!this.privacyPool.hasMinimumAnonymity()) {
      console.warn(
        `Privacy pool has low anonymity set: ${this.privacyPool.getAnonymitySetSize()}`
      );
    }

    return await this.privacyPool.deposit(amount, depositor);
  }

  /**
   * Withdraw from privacy pool
   * @param commitment - Original commitment
   * @param recipient - Withdrawal recipient
   * @param user - User keypair
   * @returns Shielded transaction
   */
  async withdrawFromPrivacyPool(
    commitment: Uint8Array,
    recipient: PublicKey,
    user: Keypair
  ): Promise<ShieldedTransaction> {
    if (!this.privacyPool) {
      throw new Error('Privacy pool not initialized');
    }

    const userSecret = this.getUserSecret(user.publicKey);
    if (!userSecret) {
      throw new Error('User secrets not found');
    }

    return await this.privacyPool.withdraw(
      commitment,
      userSecret.secret,
      userSecret.nullifier,
      recipient
    );
  }

  /**
   * Private transfer within pool
   * @param amount - Transfer amount
   * @param recipient - Recipient public key
   * @param sender - Sender keypair
   * @returns New commitment for recipient
   */
  async privateTransfer(
    amount: BN,
    recipient: PublicKey,
    sender: Keypair
  ): Promise<PrivateBetCommitment> {
    if (!this.privacyPool) {
      throw new Error('Privacy pool not initialized');
    }

    const senderSecret = this.getUserSecret(sender.publicKey);
    if (!senderSecret) {
      throw new Error('Sender secrets not found');
    }

    // Get sender's commitment
    const commitment = await this.zkGenerator.generateCommitment({
      amount,
      secret: senderSecret.secret,
      nullifier: senderSecret.nullifier,
    });

    return await this.privacyPool.privateTransfer(
      commitment,
      senderSecret.secret,
      senderSecret.nullifier,
      recipient
    );
  }

  /**
   * Verify private bet commitment
   * @param privateBet - Private bet commitment
   * @returns Verification result
   */
  async verifyPrivateBet(privateBet: PrivateBetCommitment): Promise<boolean> {
    const verification = await this.zkGenerator.verifyProof(
      privateBet.proof,
      [privateBet.marketId]
    );
    return verification.valid;
  }

  /**
   * Verify private payment proof
   * @param paymentProof - Private payment proof
   * @returns Verification result
   */
  async verifyPrivatePayment(paymentProof: PrivatePaymentProof): Promise<boolean> {
    const publicSignals = paymentProof.recipient
      ? [paymentProof.recipient.toBase58()]
      : [];
    
    const verification = await this.zkGenerator.verifyProof(
      paymentProof.proof,
      publicSignals
    );
    return verification.valid;
  }

  /**
   * Get privacy statistics
   */
  getPrivacyStats(): PrivacyStats | undefined {
    return this.privacyPool?.getStats();
  }

  /**
   * Get current privacy level
   */
  getPrivacyLevel(): PrivacyLevel {
    return { ...this.privacyLevel };
  }

  /**
   * Get anonymity set size
   */
  getAnonymitySetSize(): number {
    return this.privacyPool?.getAnonymitySetSize() || 0;
  }

  /**
   * Check if commitment exists in pool
   */
  hasCommitment(commitment: Uint8Array): boolean {
    return this.privacyPool?.hasCommitment(commitment) || false;
  }

  /**
   * Check if nullifier is used
   */
  isNullifierUsed(nullifier: Uint8Array): boolean {
    return this.privacyPool?.isNullifierUsed(nullifier) || false;
  }

  /**
   * Export user secrets (for backup)
   * @param user - User public key
   * @returns Encrypted secrets
   */
  exportUserSecrets(user: PublicKey, password: string): string {
    const userSecret = this.getUserSecret(user);
    if (!userSecret) {
      throw new Error('User secrets not found');
    }

    const secretsJson = JSON.stringify({
      secret: Buffer.from(userSecret.secret).toString('hex'),
      nullifier: Buffer.from(userSecret.nullifier).toString('hex'),
      user: user.toBase58(),
    });

    const salt = PrivacyEncryption.generateSalt();
    const key = PrivacyEncryption.deriveKeyFromPassword(password, salt);
    
    const encrypted = PrivacyEncryption.encryptChaCha20(
      new Uint8Array(Buffer.from(secretsJson)),
      key
    );

    return Buffer.from(
      JSON.stringify({
        salt: Buffer.from(salt).toString('hex'),
        encrypted: Buffer.from(encrypted.ciphertext).toString('hex'),
        nonce: Buffer.from(encrypted.nonce).toString('hex'),
      })
    ).toString('base64');
  }

  /**
   * Import user secrets (from backup)
   * @param user - User public key
   * @param encryptedSecrets - Encrypted secrets string
   * @param password - Decryption password
   */
  importUserSecrets(
    user: PublicKey,
    encryptedSecrets: string,
    password: string
  ): void {
    const data = JSON.parse(Buffer.from(encryptedSecrets, 'base64').toString());
    
    const salt = new Uint8Array(Buffer.from(data.salt, 'hex'));
    const key = PrivacyEncryption.deriveKeyFromPassword(password, salt);
    
    const encrypted = {
      ciphertext: new Uint8Array(Buffer.from(data.encrypted, 'hex')),
      nonce: new Uint8Array(Buffer.from(data.nonce, 'hex')),
      algorithm: 'chacha20poly1305' as const,
    };

    const decrypted = PrivacyEncryption.decryptChaCha20(encrypted, key);
    const secrets = JSON.parse(Buffer.from(decrypted).toString());

    this.userSecrets.set(user.toBase58(), {
      secret: new Uint8Array(Buffer.from(secrets.secret, 'hex')),
      nullifier: new Uint8Array(Buffer.from(secrets.nullifier, 'hex')),
    });
  }

  /**
   * Get user secret
   */
  private getUserSecret(
    user: PublicKey
  ): { secret: Uint8Array; nullifier: Uint8Array } | undefined {
    return this.userSecrets.get(user.toBase58());
  }
}
