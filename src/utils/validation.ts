import BN from 'bn.js';
import { VALIDATION } from '../constants';
import { Outcome } from '../types';

/**
 * Validate market ID
 * @param marketId - Market ID to validate
 * @throws Error if invalid
 */
export function validateMarketId(marketId: string): void {
  if (!marketId || marketId.trim().length === 0) {
    throw new Error('Market ID cannot be empty');
  }

  if (marketId.length > VALIDATION.MAX_MARKET_ID_LENGTH) {
    throw new Error(
      `Market ID too long (max ${VALIDATION.MAX_MARKET_ID_LENGTH} characters)`
    );
  }
}

/**
 * Validate market question
 * @param question - Question to validate
 * @throws Error if invalid
 */
export function validateQuestion(question: string): void {
  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (question.length > VALIDATION.MAX_QUESTION_LENGTH) {
    throw new Error(
      `Question too long (max ${VALIDATION.MAX_QUESTION_LENGTH} characters)`
    );
  }
}

/**
 * Validate bet amount
 * @param amount - Amount to validate
 * @throws Error if invalid
 */
export function validateBetAmount(amount: BN): void {
  if (amount.lte(new BN(0))) {
    throw new Error('Bet amount must be greater than 0');
  }

  if (amount.lt(VALIDATION.MIN_BET_AMOUNT)) {
    throw new Error(
      `Bet amount too small (minimum ${VALIDATION.MIN_BET_AMOUNT.toString()} lamports / 0.01 SOL)`
    );
  }
}

/**
 * Validate outcome
 * @param outcome - Outcome to validate
 * @throws Error if invalid
 */
export function validateOutcome(outcome: Outcome): void {
  if (outcome !== Outcome.YES && outcome !== Outcome.NO) {
    throw new Error('Invalid outcome (must be YES or NO)');
  }
}

/**
 * Validate timestamp
 * @param timestamp - Timestamp to validate
 * @throws Error if invalid
 */
export function validateTimestamp(timestamp: BN): void {
  if (timestamp.lte(new BN(0))) {
    throw new Error('Timestamp must be greater than 0');
  }
}
