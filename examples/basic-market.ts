/**
 * Basic Market Example
 * 
 * This example demonstrates:
 * 1. Creating a new prediction market
 * 2. Placing bets on YES and NO outcomes
 * 3. Checking market odds
 * 4. Resolving the market
 * 5. Claiming payouts
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PolySightClient, Outcome, lamportsToSol } from '@polysight/sdk';
import BN from 'bn.js';

async function main() {
  // Setup connection (use devnet for testing)
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const client = new PolySightClient(connection);

  console.log('🚀 PolySight Basic Market Example\n');

  // Create wallets
  const authority = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  console.log('📝 Wallets created:');
  console.log('Authority:', authority.publicKey.toBase58());
  console.log('User 1:', user1.publicKey.toBase58());
  console.log('User 2:', user2.publicKey.toBase58());
  console.log();

  // Airdrop SOL for testing (devnet only)
  console.log('💰 Requesting airdrops...');
  await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL);
  
  // Wait for confirmations
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Airdrops confirmed\n');

  // Step 1: Initialize a market
  console.log('📊 Step 1: Creating a new market...');
  const marketId = 'btc-100k-2024';
  const question = 'Will Bitcoin reach $100,000 by end of 2024?';

  const initResult = await client.initializeMarket(marketId, question, authority);
  console.log('✅ Market created!');
  console.log('Transaction:', initResult.signature);
  console.log();

  // Step 2: Place bets
  console.log('💸 Step 2: Placing bets...');
  
  // User 1 bets 1 SOL on YES
  const bet1Timestamp = new BN(Date.now());
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const bet1Result = await client.placeBet(
    marketId,
    Outcome.YES,
    1.0, // 1 SOL
    user1,
    true
  );
  console.log('✅ User 1 bet 1 SOL on YES');
  console.log('Transaction:', bet1Result.signature);

  // User 2 bets 0.5 SOL on NO
  const bet2Timestamp = new BN(Date.now());
  const bet2Result = await client.placeBet(
    marketId,
    Outcome.NO,
    0.5, // 0.5 SOL
    user2,
    true
  );
  console.log('✅ User 2 bet 0.5 SOL on NO');
  console.log('Transaction:', bet2Result.signature);
  console.log();

  // Step 3: Check market information
  console.log('📈 Step 3: Checking market information...');
  const market = await client.getMarket(marketId);
  
  if (market) {
    console.log('Market ID:', market.marketId);
    console.log('Question:', market.question);
    console.log('Status:', market.status);
    console.log('Total YES pool:', lamportsToSol(market.totalYesPool), 'SOL');
    console.log('Total NO pool:', lamportsToSol(market.totalNoPool), 'SOL');
    console.log();

    // Get odds
    const odds = await client.getMarketOdds(marketId);
    if (odds) {
      console.log('📊 Current Odds:');
      console.log('YES price:', (odds.yesPrice * 100).toFixed(2) + '%');
      console.log('NO price:', (odds.noPrice * 100).toFixed(2) + '%');
      console.log();
    }
  }

  // Step 4: Calculate potential payouts
  console.log('💰 Step 4: Calculating potential payouts...');
  
  if (market) {
    const user1Payout = await client.calculatePotentialPayout(
      marketId,
      market.totalYesPool,
      Outcome.YES
    );
    
    if (user1Payout) {
      console.log('If YES wins:');
      console.log('- Gross payout:', lamportsToSol(user1Payout.grossPayout), 'SOL');
      console.log('- Platform fee:', lamportsToSol(user1Payout.platformFee), 'SOL');
      console.log('- Net payout:', lamportsToSol(user1Payout.netPayout), 'SOL');
      console.log();
    }
  }

  // Step 5: Resolve market
  console.log('🎯 Step 5: Resolving market...');
  const resolveResult = await client.resolveMarket(
    marketId,
    Outcome.YES, // YES wins!
    authority
  );
  console.log('✅ Market resolved! Winner: YES');
  console.log('Transaction:', resolveResult.signature);
  console.log();

  // Step 6: Claim payout
  console.log('💸 Step 6: Claiming payout...');
  const claimResult = await client.claimPayout(
    marketId,
    bet1Timestamp,
    user1
  );
  console.log('✅ User 1 claimed payout!');
  console.log('Transaction:', claimResult.signature);
  console.log();

  // Final market state
  console.log('📊 Final Market State:');
  const finalMarket = await client.getMarket(marketId);
  if (finalMarket) {
    console.log('Status:', finalMarket.status);
    console.log('Winning outcome:', finalMarket.winningOutcome === Outcome.YES ? 'YES' : 'NO');
    console.log('Resolved at:', new Date(finalMarket.resolvedAt?.toNumber() || 0).toISOString());
  }

  console.log('\n✨ Example completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
