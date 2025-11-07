import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Market status enum
 */
export enum MarketStatus {
  Active = 'Active',
  Locked = 'Locked',
  Resolved = 'Resolved',
}

/**
 * Outcome enum for binary prediction markets
 */
export enum Outcome {
  NO = 0,
  YES = 1,
}

/**
 * Market account data structure
 */
export interface Market {
  authority: PublicKey;
  marketId: string;
  question: string;
  totalYesPool: BN;
  totalNoPool: BN;
  status: MarketStatus;
  winningOutcome: Outcome | null;
  resolvedAt: BN | null;
  createdAt: BN;
  bump: number;
}

/**
 * Bet account data structure
 */
export interface Bet {
  market: PublicKey;
  user: PublicKey;
  outcome: Outcome;
  amount: BN;
  claimed: boolean;
  placedAt: BN;
  bump: number;
}

/**
 * Market odds calculation result
 */
export interface MarketOdds {
  yesPrice: number;
  noPrice: number;
  totalPool: BN;
  yesPool: BN;
  noPool: BN;
}

/**
 * Payout calculation result
 */
export interface PayoutInfo {
  grossPayout: BN;
  platformFee: BN;
  netPayout: BN;
  feePercentage: number;
}

/**
 * Configuration options for PolySightClient
 */
export interface PolySightConfig {
  programId: PublicKey;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Transaction result with signature
 */
export interface TransactionResult {
  signature: string;
  success: boolean;
}

/**
 * Market creation parameters
 */
export interface CreateMarketParams {
  marketId: string;
  question: string;
  authority: PublicKey;
}

/**
 * Place bet parameters
 */
export interface PlaceBetParams {
  marketId: string;
  outcome: Outcome;
  amount: BN;
  user: PublicKey;
}

/**
 * Resolve market parameters
 */
export interface ResolveMarketParams {
  marketId: string;
  winningOutcome: Outcome;
  authority: PublicKey;
}

/**
 * Claim payout parameters
 */
export interface ClaimPayoutParams {
  market: PublicKey;
  user: PublicKey;
  betPlacedAt: BN;
}
