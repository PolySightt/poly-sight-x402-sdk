import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Program ID for PolySight smart contract
 */
export const PROGRAM_ID = new PublicKey('F3pfENkXG2hhtZgcJZmuwcZsf3c6qDr2FxrBuxxvaZns');

/**
 * PDA seeds
 */
export const SEEDS = {
  MARKET: Buffer.from('market'),
  BET: Buffer.from('bet'),
  ESCROW: Buffer.from('escrow'),
} as const;

/**
 * Account size constants
 */
export const ACCOUNT_SIZE = {
  MARKET: 8 + 32 + (4 + 50) + (4 + 200) + 8 + 8 + (1 + 1) + (1 + 1) + (1 + 8) + 8 + 1,
  BET: 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1,
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  MAX_MARKET_ID_LENGTH: 50,
  MAX_QUESTION_LENGTH: 200,
  MIN_BET_AMOUNT: new BN(10_000_000), // 0.01 SOL in lamports
} as const;

/**
 * Fee constants
 */
export const FEES = {
  PLATFORM_FEE_PERCENTAGE: 2, // 2%
  PLATFORM_FEE_BASIS_POINTS: 200, // 2% in basis points
} as const;

/**
 * Lamports per SOL
 */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Default RPC commitment level
 */
export const DEFAULT_COMMITMENT = 'confirmed' as const;
