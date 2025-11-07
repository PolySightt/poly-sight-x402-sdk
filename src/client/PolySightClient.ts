import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  createInitializeMarketInstruction,
  createPlaceBetInstruction,
  createResolveMarketInstruction,
  createClaimPayoutInstruction,
} from '../instructions';
import {
  deriveMarketPDA,
  deriveBetPDA,
  calculateMarketOdds,
  calculatePayout,
  lamportsToSol,
  solToLamports,
} from '../utils';
import {
  Market,
  Bet,
  Outcome,
  MarketStatus,
  PolySightConfig,
  TransactionResult,
  MarketOdds,
  PayoutInfo,
} from '../types';
import { PROGRAM_ID, DEFAULT_COMMITMENT } from '../constants';

/**
 * Main client for interacting with PolySight prediction markets
 */
export class PolySightClient {
  private connection: Connection;
  private programId: PublicKey;
  private commitment: Commitment;

  /**
   * Create a new PolySightClient instance
   * @param connection - Solana connection
   * @param config - Optional configuration
   */
  constructor(connection: Connection, config?: Partial<PolySightConfig>) {
    this.connection = connection;
    this.programId = config?.programId || PROGRAM_ID;
    this.commitment = config?.commitment || DEFAULT_COMMITMENT;
  }

  /**
   * Initialize a new prediction market
   * @param marketId - Unique market identifier
   * @param question - Market question
   * @param authority - Market creator keypair
   * @returns Transaction signature
   */
  async initializeMarket(
    marketId: string,
    question: string,
    authority: Keypair
  ): Promise<TransactionResult> {
    const instruction = await createInitializeMarketInstruction(
      marketId,
      question,
      authority.publicKey,
      this.programId
    );

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority],
      { commitment: this.commitment }
    );

    return { signature, success: true };
  }

  /**
   * Place a bet on a market outcome
   * @param marketId - Market identifier
   * @param outcome - Bet outcome (YES or NO)
   * @param amount - Bet amount (in SOL or lamports)
   * @param user - User keypair
   * @param amountInSol - Whether amount is in SOL (default: true)
   * @returns Transaction signature
   */
  async placeBet(
    marketId: string,
    outcome: Outcome,
    amount: number | BN,
    user: Keypair,
    amountInSol: boolean = true
  ): Promise<TransactionResult> {
    const betAmount = typeof amount === 'number' 
      ? (amountInSol ? solToLamports(amount) : new BN(amount))
      : amount;

    const timestamp = new BN(Date.now());

    const instruction = await createPlaceBetInstruction(
      marketId,
      outcome,
      betAmount,
      user.publicKey,
      timestamp,
      this.programId
    );

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [user],
      { commitment: this.commitment }
    );

    return { signature, success: true };
  }

  /**
   * Resolve a market with winning outcome
   * @param marketId - Market identifier
   * @param winningOutcome - Winning outcome (YES or NO)
   * @param authority - Market authority keypair
   * @returns Transaction signature
   */
  async resolveMarket(
    marketId: string,
    winningOutcome: Outcome,
    authority: Keypair
  ): Promise<TransactionResult> {
    const instruction = await createResolveMarketInstruction(
      marketId,
      winningOutcome,
      authority.publicKey,
      this.programId
    );

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority],
      { commitment: this.commitment }
    );

    return { signature, success: true };
  }

  /**
   * Claim payout for a winning bet
   * @param marketId - Market identifier
   * @param betPlacedAt - Timestamp when bet was placed
   * @param user - User keypair
   * @returns Transaction signature
   */
  async claimPayout(
    marketId: string,
    betPlacedAt: BN,
    user: Keypair
  ): Promise<TransactionResult> {
    const instruction = await createClaimPayoutInstruction(
      marketId,
      user.publicKey,
      betPlacedAt,
      this.programId
    );

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [user],
      { commitment: this.commitment }
    );

    return { signature, success: true };
  }

  /**
   * Fetch market account data
   * @param marketId - Market identifier
   * @returns Market account data or null if not found
   */
  async getMarket(marketId: string): Promise<Market | null> {
    const [marketPDA] = await deriveMarketPDA(marketId, this.programId);
    const accountInfo = await this.connection.getAccountInfo(marketPDA, this.commitment);

    if (!accountInfo) {
      return null;
    }

    return this.deserializeMarket(accountInfo.data);
  }

  /**
   * Fetch bet account data
   * @param marketId - Market identifier
   * @param user - User public key
   * @param betPlacedAt - Timestamp when bet was placed
   * @returns Bet account data or null if not found
   */
  async getBet(marketId: string, user: PublicKey, betPlacedAt: BN): Promise<Bet | null> {
    const [marketPDA] = await deriveMarketPDA(marketId, this.programId);
    const [betPDA] = await deriveBetPDA(marketPDA, user, betPlacedAt, this.programId);
    const accountInfo = await this.connection.getAccountInfo(betPDA, this.commitment);

    if (!accountInfo) {
      return null;
    }

    return this.deserializeBet(accountInfo.data);
  }

  /**
   * Get market odds
   * @param marketId - Market identifier
   * @returns Market odds or null if market not found
   */
  async getMarketOdds(marketId: string): Promise<MarketOdds | null> {
    const market = await this.getMarket(marketId);
    if (!market) {
      return null;
    }

    return calculateMarketOdds(market);
  }

  /**
   * Calculate potential payout for a bet
   * @param marketId - Market identifier
   * @param betAmount - Bet amount in lamports
   * @param outcome - Bet outcome
   * @returns Payout information or null if market not found
   */
  async calculatePotentialPayout(
    marketId: string,
    betAmount: BN,
    outcome: Outcome
  ): Promise<PayoutInfo | null> {
    const market = await this.getMarket(marketId);
    if (!market) {
      return null;
    }

    return calculatePayout(betAmount, outcome, market);
  }

  /**
   * Get market PDA address
   * @param marketId - Market identifier
   * @returns Market PDA and bump
   */
  async getMarketAddress(marketId: string): Promise<[PublicKey, number]> {
    return deriveMarketPDA(marketId, this.programId);
  }

  /**
   * Get bet PDA address
   * @param marketId - Market identifier
   * @param user - User public key
   * @param timestamp - Bet timestamp
   * @returns Bet PDA and bump
   */
  async getBetAddress(
    marketId: string,
    user: PublicKey,
    timestamp: BN
  ): Promise<[PublicKey, number]> {
    const [marketPDA] = await deriveMarketPDA(marketId, this.programId);
    return deriveBetPDA(marketPDA, user, timestamp, this.programId);
  }

  /**
   * Deserialize market account data
   * @param data - Raw account data
   * @returns Market object
   */
  private deserializeMarket(data: Buffer): Market {
    let offset = 8; // Skip discriminator

    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const marketIdLength = data.readUInt32LE(offset);
    offset += 4;
    const marketId = data.slice(offset, offset + marketIdLength).toString('utf-8');
    offset += marketIdLength;

    const questionLength = data.readUInt32LE(offset);
    offset += 4;
    const question = data.slice(offset, offset + questionLength).toString('utf-8');
    offset += questionLength;

    const totalYesPool = new BN(data.readBigUInt64LE(offset));
    offset += 8;

    const totalNoPool = new BN(data.readBigUInt64LE(offset));
    offset += 8;

    const statusByte = data.readUInt8(offset);
    offset += 1;
    const status = this.deserializeMarketStatus(statusByte);

    const hasWinningOutcome = data.readUInt8(offset) === 1;
    offset += 1;
    const winningOutcome = hasWinningOutcome ? data.readUInt8(offset) : null;
    if (hasWinningOutcome) offset += 1;

    const hasResolvedAt = data.readUInt8(offset) === 1;
    offset += 1;
    const resolvedAt = hasResolvedAt ? new BN(data.readBigInt64LE(offset)) : null;
    if (hasResolvedAt) offset += 8;

    const createdAt = new BN(data.readBigInt64LE(offset));
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      authority,
      marketId,
      question,
      totalYesPool,
      totalNoPool,
      status,
      winningOutcome,
      resolvedAt,
      createdAt,
      bump,
    };
  }

  /**
   * Deserialize bet account data
   * @param data - Raw account data
   * @returns Bet object
   */
  private deserializeBet(data: Buffer): Bet {
    let offset = 8; // Skip discriminator

    const market = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const outcome = data.readUInt8(offset);
    offset += 1;

    const amount = new BN(data.readBigUInt64LE(offset));
    offset += 8;

    const claimed = data.readUInt8(offset) === 1;
    offset += 1;

    const placedAt = new BN(data.readBigInt64LE(offset));
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      market,
      user,
      outcome,
      amount,
      claimed,
      placedAt,
      bump,
    };
  }

  /**
   * Deserialize market status
   * @param statusByte - Status byte
   * @returns MarketStatus enum
   */
  private deserializeMarketStatus(statusByte: number): MarketStatus {
    switch (statusByte) {
      case 0:
        return MarketStatus.Active;
      case 1:
        return MarketStatus.Locked;
      case 2:
        return MarketStatus.Resolved;
      default:
        throw new Error(`Unknown market status: ${statusByte}`);
    }
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }
}
