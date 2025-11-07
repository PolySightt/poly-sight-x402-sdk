import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { deriveMarketPDA, deriveBetPDA, deriveEscrowPDA } from '../utils';
import { validateBetAmount, validateOutcome } from '../utils/validation';
import { Outcome } from '../types';

/**
 * Create instruction to place a bet on a market
 * @param marketId - Market identifier
 * @param outcome - Bet outcome (YES or NO)
 * @param amount - Bet amount in lamports
 * @param user - User placing the bet
 * @param timestamp - Current timestamp
 * @param programId - Program ID
 * @returns Transaction instruction
 */
export async function createPlaceBetInstruction(
  marketId: string,
  outcome: Outcome,
  amount: BN,
  user: PublicKey,
  timestamp: BN,
  programId: PublicKey
): Promise<TransactionInstruction> {
  // Validate inputs
  validateBetAmount(amount);
  validateOutcome(outcome);

  // Derive PDAs
  const [marketPDA] = await deriveMarketPDA(marketId, programId);
  const [betPDA] = await deriveBetPDA(marketPDA, user, timestamp, programId);
  const [escrowPDA] = await deriveEscrowPDA(marketPDA, programId);

  // Instruction discriminator (first 8 bytes of sha256("global:place_bet"))
  const discriminator = Buffer.from([0x43, 0x8e, 0x4e, 0x1f, 0x6c, 0x8c, 0x8e, 0x0a]);

  // Serialize instruction data
  const marketIdBuffer = Buffer.from(marketId);
  const marketIdLength = Buffer.alloc(4);
  marketIdLength.writeUInt32LE(marketIdBuffer.length);

  const outcomeBuffer = Buffer.alloc(1);
  outcomeBuffer.writeUInt8(outcome);

  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount.toString()));

  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(BigInt(timestamp.toString()));

  const data = Buffer.concat([
    discriminator,
    marketIdLength,
    marketIdBuffer,
    outcomeBuffer,
    amountBuffer,
    timestampBuffer,
  ]);

  // Build instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });
}
