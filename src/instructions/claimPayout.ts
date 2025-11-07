import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { deriveMarketPDA, deriveBetPDA, deriveEscrowPDA } from '../utils';

/**
 * Create instruction to claim payout for a winning bet
 * @param marketId - Market identifier
 * @param user - User claiming the payout
 * @param betPlacedAt - Timestamp when the bet was placed
 * @param programId - Program ID
 * @returns Transaction instruction
 */
export async function createClaimPayoutInstruction(
  marketId: string,
  user: PublicKey,
  betPlacedAt: BN,
  programId: PublicKey
): Promise<TransactionInstruction> {
  // Derive PDAs
  const [marketPDA] = await deriveMarketPDA(marketId, programId);
  const [betPDA] = await deriveBetPDA(marketPDA, user, betPlacedAt, programId);
  const [escrowPDA] = await deriveEscrowPDA(marketPDA, programId);

  // Instruction discriminator (first 8 bytes of sha256("global:claim_payout"))
  const discriminator = Buffer.from([0x9a, 0x2f, 0x5c, 0x8d, 0x1e, 0x4b, 0x7a, 0x3c]);

  // Build instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: false },
      { pubkey: betPDA, isSigner: false, isWritable: true },
      { pubkey: escrowPDA, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: discriminator,
  });
}
