import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Zero-Knowledge Proof Privacy Layer Types
 * Implements privacy-preserving transactions using ZK-SNARKs
 */

/**
 * ZK-Proof configuration
 */
export interface ZKProofConfig {
  /** Circuit type to use */
  circuitType: 'groth16' | 'plonk';
  /** Proving key path or data */
  provingKey?: string | Uint8Array;
  /** Verification key path or data */
  verificationKey?: string | Uint8Array;
  /** WASM circuit path */
  wasmPath?: string;
  /** Enable privacy for amounts */
  hideAmount?: boolean;
  /** Enable privacy for addresses */
  hideAddress?: boolean;
  /** Enable privacy for outcomes */
  hideOutcome?: boolean;
}

/**
 * Private transaction input
 */
export interface PrivateTransactionInput {
  /** Transaction amount (will be hidden) */
  amount: BN;
  /** User's private key or secret */
  secret: Uint8Array;
  /** Nullifier to prevent double-spending */
  nullifier: Uint8Array;
  /** Commitment to the transaction */
  commitment?: Uint8Array;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * ZK-Proof structure
 */
export interface ZKProof {
  /** Proof data (serialized) */
  proof: Uint8Array;
  /** Public signals/inputs */
  publicSignals: string[];
  /** Proof protocol used */
  protocol: 'groth16' | 'plonk';
  /** Timestamp when proof was generated */
  timestamp: number;
  /** Proof verification key hash */
  vkHash?: string;
}

/**
 * Private bet commitment
 */
export interface PrivateBetCommitment {
  /** Commitment hash */
  commitment: Uint8Array;
  /** Nullifier hash */
  nullifier: Uint8Array;
  /** ZK-Proof of valid bet */
  proof: ZKProof;
  /** Encrypted bet details */
  encryptedData: Uint8Array;
  /** Public market ID */
  marketId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Privacy-preserving payment proof
 */
export interface PrivatePaymentProof {
  /** ZK-Proof of payment */
  proof: ZKProof;
  /** Payment commitment */
  commitment: Uint8Array;
  /** Nullifier to prevent double-spending */
  nullifier: Uint8Array;
  /** Encrypted amount */
  encryptedAmount: Uint8Array;
  /** Recipient (can be hidden) */
  recipient?: PublicKey;
  /** Merkle root for anonymity set */
  merkleRoot?: Uint8Array;
  /** Merkle path proof */
  merklePath?: Uint8Array[];
}

/**
 * ZK-Proof verification result
 */
export interface ZKVerificationResult {
  /** Whether proof is valid */
  valid: boolean;
  /** Public signals extracted */
  publicSignals?: string[];
  /** Error message if invalid */
  error?: string;
  /** Verification timestamp */
  verifiedAt: number;
  /** Gas cost estimate */
  gasCost?: number;
}

/**
 * Privacy pool configuration
 */
export interface PrivacyPoolConfig {
  /** Minimum pool size for anonymity */
  minPoolSize: number;
  /** Maximum pool size */
  maxPoolSize: number;
  /** Denomination for mixing */
  denomination: BN;
  /** Merkle tree depth */
  merkleTreeDepth: number;
  /** Pool address */
  poolAddress: PublicKey;
}

/**
 * Shielded transaction
 */
export interface ShieldedTransaction {
  /** Input commitments (nullifiers) */
  inputs: Uint8Array[];
  /** Output commitments */
  outputs: Uint8Array[];
  /** ZK-Proof of valid transaction */
  proof: ZKProof;
  /** Public amount (if any) */
  publicAmount?: BN;
  /** Encrypted memo */
  encryptedMemo?: Uint8Array;
  /** Transaction fee */
  fee: BN;
}

/**
 * Privacy statistics
 */
export interface PrivacyStats {
  /** Total private transactions */
  totalPrivateTxs: number;
  /** Total shielded amount */
  totalShieldedAmount: BN;
  /** Average anonymity set size */
  avgAnonymitySet: number;
  /** Proof generation time (ms) */
  avgProofTime: number;
  /** Verification success rate */
  verificationRate: number;
}

/**
 * Commitment scheme type
 */
export type CommitmentScheme = 'pedersen' | 'poseidon' | 'sha256';

/**
 * Privacy level configuration
 */
export interface PrivacyLevel {
  /** Privacy level name */
  level: 'low' | 'medium' | 'high' | 'maximum';
  /** Hide transaction amount */
  hideAmount: boolean;
  /** Hide sender address */
  hideSender: boolean;
  /** Hide receiver address */
  hideReceiver: boolean;
  /** Use mixing pool */
  useMixing: boolean;
  /** Minimum anonymity set size */
  minAnonymitySet: number;
  /** Commitment scheme */
  commitmentScheme: CommitmentScheme;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Encrypted payload */
  ciphertext: Uint8Array;
  /** Encryption nonce */
  nonce: Uint8Array;
  /** Ephemeral public key */
  ephemeralPubKey?: Uint8Array;
  /** Encryption algorithm */
  algorithm: 'chacha20poly1305' | 'aes-256-gcm';
}

/**
 * Nullifier set for double-spend prevention
 */
export interface NullifierSet {
  /** Set of used nullifiers */
  nullifiers: Set<string>;
  /** Merkle tree of nullifiers */
  merkleTree?: Uint8Array[];
  /** Last update timestamp */
  lastUpdate: number;
}
