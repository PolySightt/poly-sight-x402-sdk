import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { deriveMarketPDA } from '../utils';
import { validateMarketId, validateQuestion } from '../utils/validation';

/**
 * Create instruction to initialize a new prediction market
 * @param marketId - Unique market identifier
 * @param question - Market question
 * @param authority - Market authority (creator)
 * @param programId - Program ID
 * @returns Transaction instruction
 */
export async function createInitializeMarketInstruction(
  marketId: string,
  question: string,
  authority: PublicKey,
  programId: PublicKey
): Promise<TransactionInstruction> {
  // Validate inputs
  validateMarketId(marketId);
  validateQuestion(question);

  // Derive PDAs
  const [marketPDA] = await deriveMarketPDA(marketId, programId);

  // Instruction discriminator (first 8 bytes of sha256("global:initialize_market"))
  const discriminator = Buffer.from([0x60, 0x5c, 0x9b, 0x32, 0x7f, 0x4e, 0x4a, 0x0d]);

  // Serialize instruction data
  const marketIdBuffer = Buffer.from(marketId);
  const marketIdLength = Buffer.alloc(4);
  marketIdLength.writeUInt32LE(marketIdBuffer.length);

  const questionBuffer = Buffer.from(question);
  const questionLength = Buffer.alloc(4);
  questionLength.writeUInt32LE(questionBuffer.length);

  const data = Buffer.concat([
    discriminator,
    marketIdLength,
    marketIdBuffer,
    questionLength,
    questionBuffer,
  ]);

  // Build instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });
}
