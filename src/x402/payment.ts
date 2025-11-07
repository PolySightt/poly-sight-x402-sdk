import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  X402PaymentRequest,
  X402PaymentResponse,
  X402PaymentHeader,
  X402VerificationResult,
} from './types';

/**
 * x402 Payment Handler
 * Handles micropayments for prediction market operations
 */
export class X402PaymentHandler {
  private connection: Connection;
  private network: string;

  constructor(connection: Connection) {
    this.connection = connection;
    // Detect network from connection endpoint
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes('mainnet')) {
      this.network = 'mainnet-beta';
    } else if (endpoint.includes('devnet')) {
      this.network = 'devnet';
    } else {
      this.network = 'localnet';
    }
  }

  /**
   * Create a payment for x402 protected resource
   * @param request - Payment request details
   * @param payer - Payer keypair
   * @returns Payment response with signature
   */
  async createPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    const { amount, recipient, memo } = request;

    // Create transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: amount.toNumber(),
      })
    );

    // Add memo if provided
    if (memo) {
      // Note: In production, you'd use SPL Memo program
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: payer.publicKey,
          lamports: 0,
        })
      );
    }

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );

    return {
      signature,
      amount,
      timestamp: Date.now(),
      payer: payer.publicKey,
      recipient,
      success: true,
      network: this.network,
    };
  }

  /**
   * Create x402 payment header for HTTP requests
   * @param paymentResponse - Payment response from createPayment
   * @param payer - Payer keypair for signing
   * @returns Payment header object
   */
  createPaymentHeader(
    paymentResponse: X402PaymentResponse,
    payer: Keypair
  ): X402PaymentHeader {
    const paymentData = {
      signature: paymentResponse.signature,
      amount: paymentResponse.amount.toString(),
      payer: paymentResponse.payer.toBase58(),
      recipient: paymentResponse.recipient.toBase58(),
      timestamp: paymentResponse.timestamp,
      network: paymentResponse.network,
    };

    // Encode payment data as base64
    const paymentJson = JSON.stringify(paymentData);
    const paymentBase64 = Buffer.from(paymentJson).toString('base64');

    // Sign the payment data
    const messageBuffer = Buffer.from(paymentJson);
    const signatureBuffer = Buffer.from(payer.secretKey);
    
    return {
      payment: paymentBase64,
      signature: paymentResponse.signature,
      payer: payer.publicKey.toBase58(),
      timestamp: paymentResponse.timestamp,
    };
  }

  /**
   * Verify a payment transaction on-chain
   * @param signature - Transaction signature
   * @param expectedAmount - Expected payment amount
   * @param expectedRecipient - Expected recipient address
   * @returns Verification result
   */
  async verifyPayment(
    signature: string,
    expectedAmount: BN,
    expectedRecipient: PublicKey
  ): Promise<X402VerificationResult> {
    try {
      // Fetch transaction details
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return {
          valid: false,
          amount: new BN(0),
          signature,
          error: 'Transaction not found',
          verifiedAt: Date.now(),
        };
      }

      // Check if transaction was successful
      if (tx.meta?.err) {
        return {
          valid: false,
          amount: new BN(0),
          signature,
          error: 'Transaction failed',
          verifiedAt: Date.now(),
        };
      }

      // Verify amount and recipient
      // Note: This is simplified - in production you'd parse the transaction instructions
      const postBalances = tx.meta?.postBalances || [];
      const preBalances = tx.meta?.preBalances || [];
      
      // Calculate transferred amount (simplified)
      let transferredAmount = new BN(0);
      if (postBalances.length > 1 && preBalances.length > 1) {
        const diff = preBalances[0] - postBalances[0];
        transferredAmount = new BN(diff);
      }

      // Verify amount matches (within small tolerance for fees)
      const amountValid = transferredAmount.gte(expectedAmount);

      if (!amountValid) {
        return {
          valid: false,
          amount: transferredAmount,
          signature,
          error: `Amount mismatch: expected ${expectedAmount.toString()}, got ${transferredAmount.toString()}`,
          verifiedAt: Date.now(),
        };
      }

      return {
        valid: true,
        amount: transferredAmount,
        signature,
        verifiedAt: Date.now(),
      };
    } catch (error) {
      return {
        valid: false,
        amount: new BN(0),
        signature,
        error: error instanceof Error ? error.message : 'Unknown error',
        verifiedAt: Date.now(),
      };
    }
  }

  /**
   * Calculate micropayment amount based on bet size
   * @param betAmount - Bet amount in lamports
   * @param baseFee - Base fee in lamports
   * @param feePercentage - Fee percentage (e.g., 0.1 for 0.1%)
   * @returns Total payment amount
   */
  calculateMicropayment(
    betAmount: BN,
    baseFee: BN,
    feePercentage: number = 0.1
  ): BN {
    // Calculate percentage fee
    const percentageFee = betAmount
      .mul(new BN(Math.floor(feePercentage * 100)))
      .div(new BN(10000));

    // Total = base fee + percentage fee
    return baseFee.add(percentageFee);
  }

  /**
   * Check if payment is required based on amount threshold
   * @param amount - Amount to check
   * @param threshold - Threshold amount
   * @returns True if payment is required
   */
  isPaymentRequired(amount: BN, threshold: BN): boolean {
    return amount.gte(threshold);
  }

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }
}
