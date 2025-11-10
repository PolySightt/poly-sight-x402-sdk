/**
 * Privacy Layer Module
 * Zero-Knowledge Proof implementation for privacy-preserving transactions
 * 
 * Features:
 * - ZK-SNARK proofs (Groth16 & PLONK)
 * - Privacy pools for anonymous transactions
 * - Commitment schemes (Poseidon, Pedersen, SHA256)
 * - Encrypted transactions
 * - Nullifier-based double-spend prevention
 * - Merkle tree anonymity sets
 */

export * from './types';
export * from './zkproof';
export * from './encryption';
export * from './privacyPool';
export * from './privacyClient';
