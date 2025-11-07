/**
 * Market Analytics Example
 * 
 * This example demonstrates:
 * 1. Calculating market odds and probabilities
 * 2. Computing ROI for different bet sizes
 * 3. Analyzing market liquidity
 * 4. Simulating bet impact on odds
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  PolySightClient,
  Outcome,
  calculateMarketOdds,
  calculateROI,
  lamportsToSol,
  solToLamports,
} from '@polysight/sdk';

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const client = new PolySightClient(connection);

  console.log('📊 PolySight Market Analytics Example\n');

  // Setup
  const authority = Keypair.generate();
  await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Create market
  const marketId = 'analytics-demo';
  await client.initializeMarket(
    marketId,
    'Analytics Demo Market',
    authority
  );

  // Simulate some bets
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();

  await connection.requestAirdrop(user1.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.requestAirdrop(user2.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.requestAirdrop(user3.publicKey, 5 * LAMPORTS_PER_SOL);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Place various bets
  await client.placeBet(marketId, Outcome.YES, 2.0, user1, true);
  await client.placeBet(marketId, Outcome.YES, 1.5, user2, true);
  await client.placeBet(marketId, Outcome.NO, 1.0, user3, true);

  // Fetch market data
  const market = await client.getMarket(marketId);
  if (!market) {
    throw new Error('Market not found');
  }

  console.log('=== Market Overview ===');
  console.log('Question:', market.question);
  console.log('Total YES pool:', lamportsToSol(market.totalYesPool), 'SOL');
  console.log('Total NO pool:', lamportsToSol(market.totalNoPool), 'SOL');
  console.log('Total liquidity:', lamportsToSol(market.totalYesPool.add(market.totalNoPool)), 'SOL');
  console.log();

  // Calculate odds
  console.log('=== Current Odds ===');
  const odds = calculateMarketOdds(market);
  console.log('YES price:', (odds.yesPrice * 100).toFixed(2) + '%');
  console.log('NO price:', (odds.noPrice * 100).toFixed(2) + '%');
  console.log('Implied YES probability:', (odds.yesPrice * 100).toFixed(2) + '%');
  console.log('Implied NO probability:', (odds.noPrice * 100).toFixed(2) + '%');
  console.log();

  // ROI Analysis
  console.log('=== ROI Analysis ===');
  const betSizes = [0.1, 0.5, 1.0, 2.0, 5.0];

  console.log('If betting on YES:');
  for (const size of betSizes) {
    const betAmount = solToLamports(size);
    const roi = calculateROI(betAmount, Outcome.YES, market);
    console.log(`  ${size} SOL bet → ${roi.toFixed(2)}% ROI`);
  }
  console.log();

  console.log('If betting on NO:');
  for (const size of betSizes) {
    const betAmount = solToLamports(size);
    const roi = calculateROI(betAmount, Outcome.NO, market);
    console.log(`  ${size} SOL bet → ${roi.toFixed(2)}% ROI`);
  }
  console.log();

  // Payout simulation
  console.log('=== Payout Simulation ===');
  const testBet = solToLamports(1.0);

  const yesPayout = await client.calculatePotentialPayout(marketId, testBet, Outcome.YES);
  if (yesPayout) {
    console.log('1 SOL bet on YES:');
    console.log('  Gross payout:', lamportsToSol(yesPayout.grossPayout).toFixed(4), 'SOL');
    console.log('  Platform fee:', lamportsToSol(yesPayout.platformFee).toFixed(4), 'SOL');
    console.log('  Net payout:', lamportsToSol(yesPayout.netPayout).toFixed(4), 'SOL');
    console.log('  Profit:', lamportsToSol(yesPayout.netPayout.sub(testBet)).toFixed(4), 'SOL');
  }
  console.log();

  const noPayout = await client.calculatePotentialPayout(marketId, testBet, Outcome.NO);
  if (noPayout) {
    console.log('1 SOL bet on NO:');
    console.log('  Gross payout:', lamportsToSol(noPayout.grossPayout).toFixed(4), 'SOL');
    console.log('  Platform fee:', lamportsToSol(noPayout.platformFee).toFixed(4), 'SOL');
    console.log('  Net payout:', lamportsToSol(noPayout.netPayout).toFixed(4), 'SOL');
    console.log('  Profit:', lamportsToSol(noPayout.netPayout.sub(testBet)).toFixed(4), 'SOL');
  }
  console.log();

  // Market efficiency
  console.log('=== Market Efficiency ===');
  const totalPool = market.totalYesPool.add(market.totalNoPool);
  const yesRatio = market.totalYesPool.toNumber() / totalPool.toNumber();
  const noRatio = market.totalNoPool.toNumber() / totalPool.toNumber();
  
  console.log('YES pool ratio:', (yesRatio * 100).toFixed(2) + '%');
  console.log('NO pool ratio:', (noRatio * 100).toFixed(2) + '%');
  console.log('Market balance:', Math.abs(yesRatio - noRatio) < 0.2 ? 'Balanced' : 'Imbalanced');
  console.log();

  console.log('✨ Analytics completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
