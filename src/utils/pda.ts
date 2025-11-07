import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { SEEDS } from '../constants';

/**
 * Derives the Market PDA address
 * @param marketId - Unique market identifier
 * @param programId - Program ID
 * @returns Market PDA and bump seed
 */
export async function deriveMarketPDA(
  marketId: string,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [SEEDS.MARKET, Buffer.from(marketId)],
    programId
  );
}

/**
 * Derives the Bet PDA address
 * @param market - Market public key
 * @param user - User public key
 * @param timestamp - Timestamp when bet was placed
 * @param programId - Program ID
 * @returns Bet PDA and bump seed
 */
export async function deriveBetPDA(
  market: PublicKey,
  user: PublicKey,
  timestamp: BN,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(BigInt(timestamp.toString()));

  return PublicKey.findProgramAddressSync(
    [SEEDS.BET, market.toBuffer(), user.toBuffer(), timestampBuffer],
    programId
  );
}

/**
 * Derives the Escrow PDA address
 * @param market - Market public key
 * @param programId - Program ID
 * @returns Escrow PDA and bump seed
 */
export async function deriveEscrowPDA(
  market: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync([SEEDS.ESCROW, market.toBuffer()], programId);
}
