import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { deriveMarketPDA } from '../utils';
import { validateOutcome } from '../utils/validation';
import { Outcome } from '../types';

/**
 * Create instruction to resolve a market with winning outcome
 * @param marketId - Market identifier
 * @param winningOutcome - Winning outcome (YES or NO)
 * @param authority - Market authority (must match market creator)
 * @param programId - Program ID
 * @returns Transaction instruction
 */
export async function createResolveMarketInstruction(
  marketId: string,
  winningOutcome: Outcome,
  authority: PublicKey,
  programId: PublicKey
): Promise<TransactionInstruction> {
  // Validate inputs
  validateOutcome(winningOutcome);

  // Derive PDAs
  const [marketPDA] = await deriveMarketPDA(marketId, programId);

  // Instruction discriminator (first 8 bytes of sha256("global:resolve_market"))
  const discriminator = Buffer.from([0x7e, 0x3c, 0x8f, 0x1a, 0x2d, 0x5b, 0x6e, 0x9f]);

  // Serialize instruction data
  const marketIdBuffer = Buffer.from(marketId);
  const marketIdLength = Buffer.alloc(4);
  marketIdLength.writeUInt32LE(marketIdBuffer.length);

  const outcomeBuffer = Buffer.alloc(1);
  outcomeBuffer.writeUInt8(winningOutcome);

  const data = Buffer.concat([discriminator, marketIdLength, marketIdBuffer, outcomeBuffer]);

  // Build instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
    ],
    programId,
    data,
  });
}
