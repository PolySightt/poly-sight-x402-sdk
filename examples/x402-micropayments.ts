/**
 * x402 Micropayments Example
 * Demonstrates how to use x402 payment protocol with PolySight prediction markets
 */

import { Connection, Keypair } from '@solana/web3.js';
import {
  PolySightX402Client,
  Outcome,
  X402AgentConfig,
  solToLamports,
} from '../src';

async function main() {
  console.log('🚀 PolySight x402 Micropayments Demo\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Create wallets
  const authority = Keypair.generate();
  const user = Keypair.generate();
  const agent = Keypair.generate();

  console.log('💰 Requesting airdrops...');
  await connection.requestAirdrop(authority.publicKey, 2e9);
  await connection.requestAirdrop(user.publicKey, 2e9);
  await connection.requestAirdrop(agent.publicKey, 2e9);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Initialize x402 client with custom pricing
  const client = new PolySightX402Client(
    connection,
    {
      baseBetFee: solToLamports(0.0001), // 0.0001 SOL base fee
      marketAccessFee: solToLamports(0.00005), // 0.00005 SOL to access market
      oddsCalculationFee: solToLamports(0.00002), // 0.00002 SOL for odds
      predictionFee: solToLamports(0.00003), // 0.00003 SOL for prediction
    }
  );

  console.log('✅ x402 Client initialized\n');
  console.log('📊 Current Pricing:');
  const pricing = client.getPricing();
  console.log(`  - Base Bet Fee: ${pricing.baseBetFee.toString()} lamports`);
  console.log(`  - Market Access: ${pricing.marketAccessFee.toString()} lamports`);
  console.log(`  - Odds Calculation: ${pricing.oddsCalculationFee.toString()} lamports`);
  console.log(`  - Prediction: ${pricing.predictionFee.toString()} lamports\n`);

  // ========================================
  // 1. Create Market (No x402 payment)
  // ========================================
  console.log('📈 Step 1: Creating prediction market...');
  const marketId = `btc-100k-${Date.now()}`;
  await client.initializeMarket(
    marketId,
    'Will Bitcoin reach $100,000 by end of 2024?',
    authority
  );
  console.log(`✅ Market created: ${marketId}\n`);

  // ========================================
  // 2. Access Market Data with x402 Payment
  // ========================================
  console.log('🔍 Step 2: Accessing market data with x402 payment...');
  const market = await client.getMarketWithX402(marketId, user);
  console.log('✅ Market data accessed (paid micropayment)');
  console.log(`   Question: ${market?.question}\n`);

  // ========================================
  // 3. Calculate Odds with x402 Payment
  // ========================================
  console.log('📊 Step 3: Calculating odds with x402 payment...');
  const odds = await client.getMarketOddsWithX402(marketId, user);
  console.log('✅ Odds calculated (paid micropayment)');
  console.log(`   YES: ${(odds?.yesPrice || 0.5) * 100}%`);
  console.log(`   NO: ${(odds?.noPrice || 0.5) * 100}%\n`);

  // ========================================
  // 4. Place Bet with x402 Micropayment
  // ========================================
  console.log('💸 Step 4: Placing bet with x402 micropayment...');
  const betResult = await client.placeBetWithX402(
    marketId,
    Outcome.YES,
    0.1, // 0.1 SOL bet
    user,
    {
      useX402: true,
      paymentTimeout: 30000,
    }
  );
  console.log('✅ Bet placed successfully!');
  console.log(`   Bet Transaction: ${betResult.signature}`);
  if (betResult.paymentResponse) {
    console.log(`   Payment Transaction: ${betResult.paymentResponse.signature}`);
    console.log(`   Payment Amount: ${betResult.paymentResponse.amount.toString()} lamports\n`);
  }

  // ========================================
  // 5. Make Prediction with x402 Payment
  // ========================================
  console.log('🎯 Step 5: Making prediction with x402 payment...');
  const prediction = await client.makePredictionWithX402(
    marketId,
    Outcome.YES,
    0.75, // 75% confidence
    user
  );
  console.log('✅ Prediction made (paid micropayment)');
  console.log(`   Predicted Outcome: ${prediction.prediction === Outcome.YES ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${prediction.confidence * 100}%`);
  console.log(`   Expected Value: ${prediction.expectedValue.toFixed(4)}\n`);

  // ========================================
  // 6. Configure AI Agent for Autonomous Payments
  // ========================================
  console.log('🤖 Step 6: Configuring AI agent for autonomous payments...');
  const agentConfig: X402AgentConfig = {
    agentWallet: agent.publicKey,
    maxPaymentPerTx: solToLamports(0.01), // Max 0.01 SOL per transaction
    dailyLimit: solToLamports(1.0), // Max 1 SOL per day
    autoApproveThreshold: solToLamports(0.001), // Auto-approve up to 0.001 SOL
    facilitator: {
      endpoint: 'https://facilitator.polysight.bet',
    },
    autonomous: true,
  };
  client.configureAgent(agentConfig);
  console.log('✅ AI agent configured');
  console.log(`   Max per TX: ${agentConfig.maxPaymentPerTx.toString()} lamports`);
  console.log(`   Daily Limit: ${agentConfig.dailyLimit.toString()} lamports`);
  console.log(`   Auto-approve: ${agentConfig.autoApproveThreshold.toString()} lamports\n`);

  // ========================================
  // 7. Agent Places Multiple Bets Autonomously
  // ========================================
  console.log('🤖 Step 7: AI agent placing bets autonomously...');
  
  // Agent bet 1
  const agentBet1 = await client.placeBetWithX402(
    marketId,
    Outcome.YES,
    0.05,
    agent,
    { useX402: true }
  );
  console.log('✅ Agent bet 1 placed');
  console.log(`   Amount: 0.05 SOL`);
  console.log(`   Payment: ${agentBet1.paymentResponse?.amount.toString()} lamports`);

  // Agent bet 2
  const agentBet2 = await client.placeBetWithX402(
    marketId,
    Outcome.NO,
    0.03,
    agent,
    { useX402: true }
  );
  console.log('✅ Agent bet 2 placed');
  console.log(`   Amount: 0.03 SOL`);
  console.log(`   Payment: ${agentBet2.paymentResponse?.amount.toString()} lamports\n`);

  // ========================================
  // 8. View Payment Statistics
  // ========================================
  console.log('📊 Step 8: Payment Statistics');
  const stats = client.getPaymentStats();
  console.log(`   Total Payments: ${stats.totalPayments}`);
  console.log(`   Successful: ${stats.successfulPayments}`);
  console.log(`   Failed: ${stats.failedPayments}`);
  console.log(`   Total Amount Paid: ${stats.totalAmountPaid.toString()} lamports`);
  console.log(`   Average Payment: ${stats.averagePayment.toString()} lamports`);
  if (stats.lastPaymentAt) {
    console.log(`   Last Payment: ${new Date(stats.lastPaymentAt).toISOString()}`);
  }

  console.log('\n✨ x402 Micropayments Demo Complete!\n');
  console.log('🎯 Key Features Demonstrated:');
  console.log('   ✅ Micropayments for market access');
  console.log('   ✅ Pay-per-calculation (odds)');
  console.log('   ✅ Pay-per-prediction model');
  console.log('   ✅ Micropayments for bets');
  console.log('   ✅ AI agent autonomous payments');
  console.log('   ✅ Payment statistics tracking');
  console.log('   ✅ Fast settlement (400ms on Solana)');
  console.log('\n💡 Benefits:');
  console.log('   - Ultra-low fees (< $0.001 per operation)');
  console.log('   - Instant settlement');
  console.log('   - AI agents can operate autonomously');
  console.log('   - Pay-per-use model (no subscriptions)');
  console.log('   - Transparent on-chain payments');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
