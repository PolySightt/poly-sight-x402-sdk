import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * x402 Payment Protocol Types
 * Implements HTTP 402 Payment Required for micropayments on Solana
 */

/**
 * x402 Payment request structure
 */
export interface X402PaymentRequest {
  /** Amount required in lamports */
  amount: BN;
  /** Recipient address */
  recipient: PublicKey;
  /** Optional memo/description */
  memo?: string;
  /** Payment deadline (unix timestamp) */
  deadline?: number;
  /** Minimum amount acceptable */
  minAmount?: BN;
  /** Currency (default: SOL, can be USDC) */
  currency?: 'SOL' | 'USDC';
}

/**
 * x402 Payment response after successful payment
 */
export interface X402PaymentResponse {
  /** Transaction signature */
  signature: string;
  /** Payment amount in lamports */
  amount: BN;
  /** Timestamp when payment was made */
  timestamp: number;
  /** Payer public key */
  payer: PublicKey;
  /** Recipient public key */
  recipient: PublicKey;
  /** Success status */
  success: boolean;
  /** Network (devnet/mainnet-beta) */
  network: string;
}

/**
 * x402 Facilitator configuration
 */
export interface X402FacilitatorConfig {
  /** Facilitator endpoint URL */
  endpoint: string;
  /** API key for facilitator (optional) */
  apiKey?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry attempts */
  retries?: number;
}

/**
 * x402 Payment header structure
 */
export interface X402PaymentHeader {
  /** Base64 encoded payment proof */
  payment: string;
  /** Signature of the payment */
  signature: string;
  /** Payer public key */
  payer: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * x402 Protected resource response
 */
export interface X402ProtectedResponse<T = any> {
  /** HTTP status code */
  statusCode: number;
  /** Response data (if payment successful) */
  data?: T;
  /** Payment request (if 402 returned) */
  paymentRequest?: X402PaymentRequest;
  /** Payment response (if payment was made) */
  paymentResponse?: X402PaymentResponse;
  /** Error message (if any) */
  error?: string;
}

/**
 * x402 Bet payment options
 */
export interface X402BetOptions {
  /** Enable x402 payment for this bet */
  useX402: boolean;
  /** Facilitator to use */
  facilitator?: X402FacilitatorConfig;
  /** Auto-pay if amount is below threshold */
  autoPayThreshold?: BN;
  /** Payment timeout in milliseconds */
  paymentTimeout?: number;
}

/**
 * x402 Market access options
 */
export interface X402MarketAccessOptions {
  /** Price to access market data (in lamports) */
  accessPrice?: BN;
  /** Price per odds calculation */
  oddsPrice?: BN;
  /** Price per prediction */
  predictionPrice?: BN;
  /** Facilitator configuration */
  facilitator?: X402FacilitatorConfig;
}

/**
 * x402 Transaction metadata
 */
export interface X402TransactionMetadata {
  /** Transaction type */
  type: 'bet' | 'market_access' | 'odds_query' | 'prediction';
  /** Market ID */
  marketId: string;
  /** Amount paid */
  amountPaid: BN;
  /** Timestamp */
  timestamp: number;
  /** Transaction signature */
  signature: string;
}

/**
 * x402 Payment verification result
 */
export interface X402VerificationResult {
  /** Is payment valid */
  valid: boolean;
  /** Payment amount */
  amount: BN;
  /** Transaction signature */
  signature: string;
  /** Error message if invalid */
  error?: string;
  /** Verification timestamp */
  verifiedAt: number;
}

/**
 * x402 Micropayment pricing
 */
export interface X402MicropaymentPricing {
  /** Base bet fee (in lamports) */
  baseBetFee: BN;
  /** Per-dollar bet fee (in lamports per SOL) */
  perDollarFee: BN;
  /** Market data access fee */
  marketAccessFee: BN;
  /** Odds calculation fee */
  oddsCalculationFee: BN;
  /** Prediction fee */
  predictionFee: BN;
  /** Minimum payment */
  minimumPayment: BN;
}

/**
 * x402 Agent configuration for autonomous payments
 */
export interface X402AgentConfig {
  /** Agent wallet keypair */
  agentWallet: PublicKey;
  /** Maximum payment per transaction */
  maxPaymentPerTx: BN;
  /** Daily spending limit */
  dailyLimit: BN;
  /** Auto-approve payments below threshold */
  autoApproveThreshold: BN;
  /** Facilitator to use */
  facilitator: X402FacilitatorConfig;
  /** Enable autonomous mode */
  autonomous: boolean;
}

/**
 * x402 Payment statistics
 */
export interface X402PaymentStats {
  /** Total payments made */
  totalPayments: number;
  /** Total amount paid (in lamports) */
  totalAmountPaid: BN;
  /** Average payment amount */
  averagePayment: BN;
  /** Successful payments */
  successfulPayments: number;
  /** Failed payments */
  failedPayments: number;
  /** Last payment timestamp */
  lastPaymentAt?: number;
}
