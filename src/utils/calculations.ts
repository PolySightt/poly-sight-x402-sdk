import BN from 'bn.js';
import { Market, MarketOdds, PayoutInfo, Outcome } from '../types';
import { FEES, LAMPORTS_PER_SOL } from '../constants';

/**
 * Calculate market odds based on pool sizes
 * @param market - Market account data
 * @returns Market odds with prices
 */
export function calculateMarketOdds(market: Market): MarketOdds {
  const totalPool = market.totalYesPool.add(market.totalNoPool);

  // Avoid division by zero
  if (totalPool.isZero()) {
    return {
      yesPrice: 0.5,
      noPrice: 0.5,
      totalPool,
      yesPool: market.totalYesPool,
      noPool: market.totalNoPool,
    };
  }

  // Price = pool / total_pool
  const yesPrice = market.totalYesPool.toNumber() / totalPool.toNumber();
  const noPrice = market.totalNoPool.toNumber() / totalPool.toNumber();

  return {
    yesPrice,
    noPrice,
    totalPool,
    yesPool: market.totalYesPool,
    noPool: market.totalNoPool,
  };
}

/**
 * Calculate expected payout for a winning bet
 * @param betAmount - Amount of the bet
 * @param betOutcome - Outcome of the bet (YES or NO)
 * @param market - Market account data
 * @returns Payout information including fees
 */
export function calculatePayout(
  betAmount: BN,
  betOutcome: Outcome,
  market: Market
): PayoutInfo {
  const totalPool = market.totalYesPool.add(market.totalNoPool);
  const winningPool = betOutcome === Outcome.YES ? market.totalYesPool : market.totalNoPool;

  // Avoid division by zero
  if (winningPool.isZero()) {
    return {
      grossPayout: new BN(0),
      platformFee: new BN(0),
      netPayout: new BN(0),
      feePercentage: FEES.PLATFORM_FEE_PERCENTAGE,
    };
  }

  // Gross payout = (bet_amount / winning_pool) * total_pool
  const grossPayout = betAmount.mul(totalPool).div(winningPool);

  // Platform fee (2%)
  const platformFee = grossPayout.mul(new BN(FEES.PLATFORM_FEE_PERCENTAGE)).div(new BN(100));

  // Net payout after fee
  const netPayout = grossPayout.sub(platformFee);

  return {
    grossPayout,
    platformFee,
    netPayout,
    feePercentage: FEES.PLATFORM_FEE_PERCENTAGE,
  };
}

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: BN): number {
  return lamports.toNumber() / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): BN {
  return new BN(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Calculate implied probability from pool sizes
 * @param market - Market account data
 * @returns Implied probabilities for YES and NO
 */
export function calculateImpliedProbability(market: Market): {
  yesProbability: number;
  noProbability: number;
} {
  const odds = calculateMarketOdds(market);
  return {
    yesProbability: odds.yesPrice,
    noProbability: odds.noPrice,
  };
}

/**
 * Calculate potential return on investment (ROI)
 * @param betAmount - Amount of the bet
 * @param betOutcome - Outcome of the bet
 * @param market - Market account data
 * @returns ROI as a percentage
 */
export function calculateROI(betAmount: BN, betOutcome: Outcome, market: Market): number {
  const payout = calculatePayout(betAmount, betOutcome, market);

  if (betAmount.isZero()) {
    return 0;
  }

  const profit = payout.netPayout.sub(betAmount);
  const roi = (profit.toNumber() / betAmount.toNumber()) * 100;

  return roi;
}
