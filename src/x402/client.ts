import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PolySightClient } from '../client/PolySightClient';
import { X402PaymentHandler } from './payment';
import {
  X402BetOptions,
  X402PaymentRequest,
  X402PaymentResponse,
  X402MicropaymentPricing,
  X402PaymentStats,
  X402AgentConfig,
} from './types';
import { Outcome, TransactionResult } from '../types';
import { solToLamports } from '../utils';

/**
 * PolySight x402 Client
 * Extends PolySightClient with x402 micropayment capabilities
 */
export class PolySightX402Client extends PolySightClient {
  private paymentHandler: X402PaymentHandler;
  private pricing: X402MicropaymentPricing;
  private stats: X402PaymentStats;
  private agentConfig?: X402AgentConfig;

  /**
   * Create a new PolySightX402Client
   * @param connection - Solana connection
   * @param pricing - Micropayment pricing configuration
   * @param config - Optional PolySight configuration
   */
  constructor(
    connection: Connection,
    pricing?: Partial<X402MicropaymentPricing>,
    config?: any
  ) {
    super(connection, config);
    this.paymentHandler = new X402PaymentHandler(connection);
    
    // Default pricing (very low fees for micropayments)
    this.pricing = {
      baseBetFee: pricing?.baseBetFee || solToLamports(0.0001), // 0.0001 SOL
      perDollarFee: pricing?.perDollarFee || solToLamports(0.00001), // 0.00001 SOL per dollar
      marketAccessFee: pricing?.marketAccessFee || solToLamports(0.00005), // 0.00005 SOL
      oddsCalculationFee: pricing?.oddsCalculationFee || solToLamports(0.00002), // 0.00002 SOL
      predictionFee: pricing?.predictionFee || solToLamports(0.00003), // 0.00003 SOL
      minimumPayment: pricing?.minimumPayment || solToLamports(0.00001), // 0.00001 SOL
    };

    // Initialize stats
    this.stats = {
      totalPayments: 0,
      totalAmountPaid: new BN(0),
      averagePayment: new BN(0),
      successfulPayments: 0,
      failedPayments: 0,
    };
  }

  /**
   * Configure AI agent for autonomous payments
   * @param config - Agent configuration
   */
  configureAgent(config: X402AgentConfig): void {
    this.agentConfig = config;
  }

  /**
   * Place a bet with x402 micropayment
   * @param marketId - Market identifier
   * @param outcome - Bet outcome
   * @param amount - Bet amount
   * @param user - User keypair
   * @param options - x402 bet options
   * @returns Transaction result with payment info
   */
  async placeBetWithX402(
    marketId: string,
    outcome: Outcome,
    amount: number | BN,
    user: Keypair,
    options?: X402BetOptions
  ): Promise<TransactionResult & { paymentResponse?: X402PaymentResponse }> {
    const betAmount = typeof amount === 'number' ? solToLamports(amount) : amount;

    // Calculate micropayment fee
    const micropaymentFee = this.paymentHandler.calculateMicropayment(
      betAmount,
      this.pricing.baseBetFee,
      0.01 // 0.01% fee
    );

    // Check if payment is required
    const paymentRequired = options?.useX402 !== false;

    let paymentResponse: X402PaymentResponse | undefined;

    if (paymentRequired) {
      // Check agent auto-approve
      if (this.agentConfig?.autonomous) {
        const shouldAutoApprove = micropaymentFee.lte(
          this.agentConfig.autoApproveThreshold
        );
        
        if (!shouldAutoApprove) {
          throw new Error(
            `Payment ${micropaymentFee.toString()} exceeds auto-approve threshold ${this.agentConfig.autoApproveThreshold.toString()}`
          );
        }
      }

      // Create payment request
      const paymentRequest: X402PaymentRequest = {
        amount: micropaymentFee,
        recipient: this.getProgramId(), // In production, this would be facilitator address
        memo: `PolySight bet payment: ${marketId}`,
        deadline: Date.now() + (options?.paymentTimeout || 30000),
        currency: 'SOL',
      };

      try {
        // Execute micropayment
        paymentResponse = await this.paymentHandler.createPayment(
          paymentRequest,
          user
        );

        // Update stats
        this.updateStats(paymentResponse);
      } catch (error) {
        this.stats.failedPayments++;
        throw new Error(
          `x402 payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Place the actual bet
    const result = await this.placeBet(marketId, outcome, amount, user);

    return {
      ...result,
      paymentResponse,
    };
  }

  /**
   * Get market data with x402 micropayment
   * @param marketId - Market identifier
   * @param payer - Optional payer for access fee
   * @returns Market data
   */
  async getMarketWithX402(marketId: string, payer?: Keypair) {
    // If payer provided, charge access fee
    if (payer) {
      const paymentRequest: X402PaymentRequest = {
        amount: this.pricing.marketAccessFee,
        recipient: this.getProgramId(),
        memo: `Market access: ${marketId}`,
        currency: 'SOL',
      };

      try {
        const paymentResponse = await this.paymentHandler.createPayment(
          paymentRequest,
          payer
        );
        this.updateStats(paymentResponse);
      } catch (error) {
        this.stats.failedPayments++;
        throw new Error(`Market access payment failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return this.getMarket(marketId);
  }

  /**
   * Calculate odds with x402 micropayment
   * @param marketId - Market identifier
   * @param payer - Payer for calculation fee
   * @returns Market odds
   */
  async getMarketOddsWithX402(marketId: string, payer: Keypair) {
    const paymentRequest: X402PaymentRequest = {
      amount: this.pricing.oddsCalculationFee,
      recipient: this.getProgramId(),
      memo: `Odds calculation: ${marketId}`,
      currency: 'SOL',
    };

    try {
      const paymentResponse = await this.paymentHandler.createPayment(
        paymentRequest,
        payer
      );
      this.updateStats(paymentResponse);
    } catch (error) {
      this.stats.failedPayments++;
      throw new Error(`Odds calculation payment failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return this.getMarketOdds(marketId);
  }

  /**
   * Make a prediction with x402 micropayment
   * @param marketId - Market identifier
   * @param outcome - Predicted outcome
   * @param confidence - Confidence level (0-1)
   * @param payer - Payer for prediction fee
   * @returns Prediction result
   */
  async makePredictionWithX402(
    marketId: string,
    outcome: Outcome,
    confidence: number,
    payer: Keypair
  ): Promise<{
    marketId: string;
    prediction: Outcome;
    confidence: number;
    odds: any;
    expectedValue: number;
    paymentResponse: X402PaymentResponse;
  }> {
    // Pay for prediction
    const paymentRequest: X402PaymentRequest = {
      amount: this.pricing.predictionFee,
      recipient: this.getProgramId(),
      memo: `Prediction: ${marketId}`,
      currency: 'SOL',
    };

    const paymentResponse = await this.paymentHandler.createPayment(
      paymentRequest,
      payer
    );
    this.updateStats(paymentResponse);

    // Get market odds
    const odds = await this.getMarketOdds(marketId);
    
    if (!odds) {
      throw new Error('Market not found');
    }

    // Calculate expected value
    const outcomePrice = outcome === Outcome.YES ? odds.yesPrice : odds.noPrice;
    const expectedValue = confidence - outcomePrice;

    return {
      marketId,
      prediction: outcome,
      confidence,
      odds,
      expectedValue,
      paymentResponse,
    };
  }

  /**
   * Get payment statistics
   * @returns Payment statistics
   */
  getPaymentStats(): X402PaymentStats {
    return { ...this.stats };
  }

  /**
   * Get current pricing
   * @returns Micropayment pricing
   */
  getPricing(): X402MicropaymentPricing {
    return { ...this.pricing };
  }

  /**
   * Update pricing
   * @param pricing - New pricing configuration
   */
  updatePricing(pricing: Partial<X402MicropaymentPricing>): void {
    this.pricing = {
      ...this.pricing,
      ...pricing,
    };
  }

  /**
   * Get payment handler
   * @returns Payment handler instance
   */
  getPaymentHandler(): X402PaymentHandler {
    return this.paymentHandler;
  }

  /**
   * Update payment statistics
   * @param paymentResponse - Payment response
   */
  private updateStats(paymentResponse: X402PaymentResponse): void {
    this.stats.totalPayments++;
    this.stats.successfulPayments++;
    this.stats.totalAmountPaid = this.stats.totalAmountPaid.add(
      paymentResponse.amount
    );
    this.stats.averagePayment = this.stats.totalAmountPaid.div(
      new BN(this.stats.totalPayments)
    );
    this.stats.lastPaymentAt = paymentResponse.timestamp;
  }

  /**
   * Check if agent can make autonomous payment
   * @param amount - Payment amount
   * @returns True if agent can pay autonomously
   */
  canAgentPayAutonomously(amount: BN): boolean {
    if (!this.agentConfig?.autonomous) {
      return false;
    }

    // Check daily limit
    const dailySpent = this.stats.totalAmountPaid; // Simplified - should track daily
    const remainingLimit = this.agentConfig.dailyLimit.sub(dailySpent);

    if (amount.gt(remainingLimit)) {
      return false;
    }

    // Check per-transaction limit
    if (amount.gt(this.agentConfig.maxPaymentPerTx)) {
      return false;
    }

    // Check auto-approve threshold
    if (amount.gt(this.agentConfig.autoApproveThreshold)) {
      return false;
    }

    return true;
  }
}
