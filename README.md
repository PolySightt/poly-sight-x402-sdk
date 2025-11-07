# PolySight x402 SDK

[![npm version](https://img.shields.io/npm/v/@polysight/sdk.svg)](https://www.npmjs.com/package/@polysight/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PolySight x402 SDK for building prediction markets (Polymarket-style) on Solana using the PolySight smart contract.

**Now with x402 Payment Protocol** - Enable micropayments, AI agent autonomous trading, and pay-per-use model with ultra-low fees!

## Features

✨ **Full TypeScript Support** - Complete type safety and IntelliSense support  
🔐 **Secure** - Built with security best practices and comprehensive validation  
📦 **Easy to Use** - Simple, intuitive API for all market operations  
🧮 **Advanced Calculations** - Built-in odds, payout, and ROI calculations  
🎯 **Production Ready** - Thoroughly tested and optimized for production use  
📚 **Well Documented** - Comprehensive documentation and examples  
⚡ **x402 Micropayments** - HTTP 402 payment protocol for ultra-low fees  
🤖 **AI Agent Ready** - Autonomous payments for AI agents  

## Installation

```bash
npm install @polysight/sdk @solana/web3.js
```

or with yarn:

```bash
yarn add @polysight/sdk @solana/web3.js
```

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { PolySightClient, Outcome } from '@polysight/sdk';

// Initialize connection and client
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const client = new PolySightClient(connection);

// Create a wallet (or use existing)
const authority = Keypair.generate();

// Initialize a new market
const result = await client.initializeMarket(
  'btc-100k-2024',
  'Will Bitcoin reach $100,000 by end of 2024?',
  authority
);

console.log('Market created:', result.signature);
```

## 🚀 x402 Micropayments

PolySight SDK integrates **x402 payment protocol** for ultra-low micropayments:

```typescript
import { PolySightX402Client, solToLamports } from '@polysight/sdk';

// Initialize x402 client with custom pricing
const x402Client = new PolySightX402Client(
  connection,
  {
    baseBetFee: solToLamports(0.0001),       // 0.0001 SOL (~$0.01)
    marketAccessFee: solToLamports(0.00005), // 0.00005 SOL (~$0.005)
  }
);

// Place bet with micropayment
const result = await x402Client.placeBetWithX402(
  'btc-100k',
  Outcome.YES,
  0.1,
  userKeypair,
  { useX402: true }
);
```

**Benefits:**
- ⚡ 400ms settlement on Solana
- 💰 Ultra-low fees (< $0.001 per operation)
- 🤖 AI agent autonomous payments
- 📊 Pay-per-use model

**x402 Features:**
- 💸 **Micropayments** - Pay as little as $0.001 per operation
- 🤖 **AI Agents** - Autonomous payments with spending limits
- 📊 **Pay-per-Use** - Market access, odds calculation, predictions
- ⚡ **Fast** - 400ms settlement on Solana
- 📈 **Statistics** - Track all payment activity

**[📖 Read full x402 Guide →](X402_GUIDE.md)**

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [x402 Micropayments](#-x402-micropayments)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [x402 Examples](#x402-examples)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [x402 API Reference](#x402-api-reference)
- [Constants](#constants)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Support](#support)

## Core Concepts

### Market Lifecycle

1. **Initialize** - Create a new prediction market
2. **Place Bets** - Users bet on YES or NO outcomes
3. **Resolve** - Market authority resolves with winning outcome
4. **Claim Payouts** - Winners claim their payouts

### Outcomes

Markets support binary outcomes:
- `Outcome.YES` (1) - Positive outcome
- `Outcome.NO` (0) - Negative outcome

## Usage Examples

### 1. Initialize a Market

```typescript
import { PolySightClient } from '@polysight/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new PolySightClient(connection);
const authority = Keypair.fromSecretKey(/* your secret key */);

const result = await client.initializeMarket(
  'eth-5k-2024',
  'Will Ethereum reach $5,000 in 2024?',
  authority
);

console.log('Transaction signature:', result.signature);
```

### 2. Place a Bet

```typescript
import { Outcome } from '@polysight/sdk';

const user = Keypair.fromSecretKey(/* user secret key */);

// Bet 1 SOL on YES
const result = await client.placeBet(
  'eth-5k-2024',
  Outcome.YES,
  1.0, // Amount in SOL
  user,
  true // amountInSol = true
);

console.log('Bet placed:', result.signature);
```

### 3. Get Market Information

```typescript
// Fetch market data
const market = await client.getMarket('eth-5k-2024');

if (market) {
  console.log('Market:', market.question);
  console.log('Status:', market.status);
  console.log('Total YES pool:', market.totalYesPool.toString());
  console.log('Total NO pool:', market.totalNoPool.toString());
}

// Get market odds
const odds = await client.getMarketOdds('eth-5k-2024');

if (odds) {
  console.log('YES price:', odds.yesPrice);
  console.log('NO price:', odds.noPrice);
  console.log('Total pool:', odds.totalPool.toString());
}
```

### 4. Calculate Potential Payout

```typescript
import BN from 'bn.js';
import { solToLamports } from '@polysight/sdk';

const betAmount = solToLamports(1.0); // 1 SOL

const payout = await client.calculatePotentialPayout(
  'eth-5k-2024',
  betAmount,
  Outcome.YES
);

if (payout) {
  console.log('Gross payout:', payout.grossPayout.toString());
  console.log('Platform fee:', payout.platformFee.toString());
  console.log('Net payout:', payout.netPayout.toString());
  console.log('Fee percentage:', payout.feePercentage + '%');
}
```

### 5. Resolve a Market

```typescript
// Only market authority can resolve
const result = await client.resolveMarket(
  'eth-5k-2024',
  Outcome.YES, // Winning outcome
  authority
);

console.log('Market resolved:', result.signature);
```

### 6. Claim Payout

```typescript
import BN from 'bn.js';

// User claims payout for their winning bet
const betTimestamp = new BN(1234567890); // Timestamp when bet was placed

const result = await client.claimPayout(
  'eth-5k-2024',
  betTimestamp,
  user
);

console.log('Payout claimed:', result.signature);
```

## x402 Examples

### 1. Place Bet with Micropayment

```typescript
import { PolySightX402Client, Outcome, solToLamports } from '@polysight/sdk';

// Initialize x402 client
const x402Client = new PolySightX402Client(
  connection,
  {
    baseBetFee: solToLamports(0.0001),       // 0.0001 SOL
    marketAccessFee: solToLamports(0.00005), // 0.00005 SOL
    oddsCalculationFee: solToLamports(0.00002),
    predictionFee: solToLamports(0.00003),
  }
);

// Place bet with micropayment
const result = await x402Client.placeBetWithX402(
  'btc-100k',
  Outcome.YES,
  0.1, // 0.1 SOL bet
  userKeypair,
  {
    useX402: true,
    paymentTimeout: 30000,
  }
);

console.log('Bet placed:', result.signature);
console.log('Payment:', result.paymentResponse?.signature);
console.log('Fee paid:', result.paymentResponse?.amount.toString(), 'lamports');
```

### 2. Pay for Market Access

```typescript
// Pay small fee to access market data
const market = await x402Client.getMarketWithX402(
  'btc-100k',
  userKeypair
);

console.log('Market accessed:', market?.question);
// Cost: ~0.00005 SOL (~$0.005)
```

### 3. Pay-per-Prediction

```typescript
// Make prediction and pay per use
const prediction = await x402Client.makePredictionWithX402(
  'btc-100k',
  Outcome.YES,
  0.75, // 75% confidence
  userKeypair
);

console.log('Prediction:', prediction.prediction === Outcome.YES ? 'YES' : 'NO');
console.log('Confidence:', prediction.confidence * 100 + '%');
console.log('Expected Value:', prediction.expectedValue);
console.log('Payment:', prediction.paymentResponse.signature);
// Cost: ~0.00003 SOL (~$0.003)
```

### 4. Configure AI Agent

```typescript
import { X402AgentConfig } from '@polysight/sdk';

// Configure agent for autonomous payments
const agentConfig: X402AgentConfig = {
  agentWallet: agentKeypair.publicKey,
  maxPaymentPerTx: solToLamports(0.01),      // Max 0.01 SOL per TX
  dailyLimit: solToLamports(1.0),            // Max 1 SOL per day
  autoApproveThreshold: solToLamports(0.001), // Auto-approve < 0.001 SOL
  facilitator: {
    endpoint: 'https://facilitator.polysight.bet',
  },
  autonomous: true,
};

x402Client.configureAgent(agentConfig);

// Agent can now place bets autonomously
const agentBet = await x402Client.placeBetWithX402(
  'btc-100k',
  Outcome.YES,
  0.05,
  agentKeypair,
  { useX402: true }
);

console.log('Agent bet placed autonomously!');
```

### 5. Track Payment Statistics

```typescript
// Get payment statistics
const stats = x402Client.getPaymentStats();

console.log('Total Payments:', stats.totalPayments);
console.log('Successful:', stats.successfulPayments);
console.log('Failed:', stats.failedPayments);
console.log('Total Paid:', stats.totalAmountPaid.toString(), 'lamports');
console.log('Average Payment:', stats.averagePayment.toString(), 'lamports');

if (stats.lastPaymentAt) {
  console.log('Last Payment:', new Date(stats.lastPaymentAt).toISOString());
}
```

### 6. Custom Pricing

```typescript
// Update pricing dynamically
x402Client.updatePricing({
  baseBetFee: solToLamports(0.0002),
  marketAccessFee: solToLamports(0.0001),
});

const newPricing = x402Client.getPricing();
console.log('Updated pricing:', newPricing);
```

## Advanced Usage

### Custom Program ID

```typescript
import { PublicKey } from '@solana/web3.js';

const client = new PolySightClient(connection, {
  programId: new PublicKey('YourCustomProgramId'),
  commitment: 'finalized'
});
```

### Working with PDAs

```typescript
// Get market address
const [marketPDA, bump] = await client.getMarketAddress('eth-5k-2024');
console.log('Market PDA:', marketPDA.toBase58());

// Get bet address
const timestamp = new BN(Date.now());
const [betPDA, betBump] = await client.getBetAddress(
  'eth-5k-2024',
  user.publicKey,
  timestamp
);
console.log('Bet PDA:', betPDA.toBase58());
```

### Utility Functions

```typescript
import {
  lamportsToSol,
  solToLamports,
  calculateMarketOdds,
  calculatePayout,
  calculateROI
} from '@polysight/sdk';

// Convert between SOL and lamports
const lamports = solToLamports(1.5); // 1.5 SOL to lamports
const sol = lamportsToSol(lamports); // Back to SOL

// Calculate odds from market data
const market = await client.getMarket('eth-5k-2024');
if (market) {
  const odds = calculateMarketOdds(market);
  console.log('Implied YES probability:', odds.yesPrice * 100 + '%');
  
  // Calculate ROI
  const roi = calculateROI(solToLamports(1), Outcome.YES, market);
  console.log('Expected ROI:', roi.toFixed(2) + '%');
}
```

## API Reference

### PolySightClient

Main client class for interacting with PolySight markets.

#### Constructor

```typescript
constructor(connection: Connection, config?: Partial<PolySightConfig>)
```

#### Methods

- `initializeMarket(marketId, question, authority)` - Create a new market
- `placeBet(marketId, outcome, amount, user, amountInSol?)` - Place a bet
- `resolveMarket(marketId, winningOutcome, authority)` - Resolve a market
- `claimPayout(marketId, betPlacedAt, user)` - Claim payout
- `getMarket(marketId)` - Fetch market data
- `getBet(marketId, user, betPlacedAt)` - Fetch bet data
- `getMarketOdds(marketId)` - Get current market odds
- `calculatePotentialPayout(marketId, betAmount, outcome)` - Calculate payout
- `getMarketAddress(marketId)` - Get market PDA
- `getBetAddress(marketId, user, timestamp)` - Get bet PDA

## x402 API Reference

### PolySightX402Client

Extended client with x402 micropayment capabilities. Inherits all methods from `PolySightClient`.

#### Constructor

```typescript
constructor(
  connection: Connection,
  pricing?: Partial<X402MicropaymentPricing>,
  config?: Partial<PolySightConfig>
)
```

#### x402 Methods

**Payment Operations:**
- `placeBetWithX402(marketId, outcome, amount, user, options?)` - Place bet with micropayment
- `getMarketWithX402(marketId, payer?)` - Access market data with payment
- `getMarketOddsWithX402(marketId, payer)` - Calculate odds with payment
- `makePredictionWithX402(marketId, outcome, confidence, payer)` - Make prediction with payment

**Configuration:**
- `configureAgent(config)` - Configure AI agent for autonomous payments
- `updatePricing(pricing)` - Update micropayment pricing

**Statistics:**
- `getPaymentStats()` - Get payment statistics
- `getPricing()` - Get current pricing configuration
- `canAgentPayAutonomously(amount)` - Check if agent can pay autonomously

**Payment Handler:**
- `getPaymentHandler()` - Get underlying payment handler instance

### X402PaymentHandler

Core payment processing class.

#### Methods

- `createPayment(request, payer)` - Execute micropayment on Solana
- `verifyPayment(signature, expectedAmount, recipient)` - Verify payment on-chain
- `calculateMicropayment(betAmount, baseFee, feePercentage)` - Calculate payment amount
- `createPaymentHeader(paymentResponse, payer)` - Generate HTTP 402 headers
- `isPaymentRequired(amount, threshold)` - Check if payment is required

### x402 Types

```typescript
interface X402MicropaymentPricing {
  baseBetFee: BN;              // Base fee for bets
  perDollarFee: BN;            // Fee per dollar bet
  marketAccessFee: BN;         // Fee to access market data
  oddsCalculationFee: BN;      // Fee for odds calculation
  predictionFee: BN;           // Fee for predictions
  minimumPayment: BN;          // Minimum payment amount
}

interface X402AgentConfig {
  agentWallet: PublicKey;      // Agent's wallet
  maxPaymentPerTx: BN;         // Max payment per transaction
  dailyLimit: BN;              // Daily spending limit
  autoApproveThreshold: BN;    // Auto-approve threshold
  facilitator: X402FacilitatorConfig;
  autonomous: boolean;         // Enable autonomous mode
}

interface X402PaymentStats {
  totalPayments: number;       // Total number of payments
  totalAmountPaid: BN;         // Total amount paid
  averagePayment: BN;          // Average payment amount
  successfulPayments: number;  // Successful payment count
  failedPayments: number;      // Failed payment count
  lastPaymentAt?: number;      // Last payment timestamp
}

interface X402BetOptions {
  useX402: boolean;            // Enable x402 payment
  facilitator?: X402FacilitatorConfig;
  autoPayThreshold?: BN;       // Auto-pay threshold
  paymentTimeout?: number;     // Payment timeout (ms)
}
```

### Types

```typescript
enum Outcome {
  NO = 0,
  YES = 1
}

enum MarketStatus {
  Active = 'Active',
  Locked = 'Locked',
  Resolved = 'Resolved'
}

interface Market {
  authority: PublicKey;
  marketId: string;
  question: string;
  totalYesPool: BN;
  totalNoPool: BN;
  status: MarketStatus;
  winningOutcome: Outcome | null;
  resolvedAt: BN | null;
  createdAt: BN;
  bump: number;
}

interface Bet {
  market: PublicKey;
  user: PublicKey;
  outcome: Outcome;
  amount: BN;
  claimed: boolean;
  placedAt: BN;
  bump: number;
}
```

## Constants

```typescript
PROGRAM_ID: PublicKey // Default program ID
LAMPORTS_PER_SOL: number // 1,000,000,000
VALIDATION.MIN_BET_AMOUNT: BN // 0.01 SOL minimum
VALIDATION.MAX_MARKET_ID_LENGTH: number // 50 characters
VALIDATION.MAX_QUESTION_LENGTH: number // 200 characters
FEES.PLATFORM_FEE_PERCENTAGE: number // 2%
```

## Error Handling

```typescript
try {
  await client.placeBet('eth-5k-2024', Outcome.YES, 0.5, user);
} catch (error) {
  if (error.message.includes('Bet amount too small')) {
    console.error('Minimum bet is 0.01 SOL');
  } else if (error.message.includes('Market not active')) {
    console.error('Market is not accepting bets');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## Best Practices

### General
1. **Always validate inputs** - Use built-in validation functions
2. **Handle errors gracefully** - Wrap transactions in try-catch blocks
3. **Check market status** - Verify market is active before placing bets
4. **Use appropriate commitment levels** - Choose based on your needs
5. **Store bet timestamps** - Required for claiming payouts
6. **Test on devnet first** - Always test before deploying to mainnet

### x402 Specific
7. **Set reasonable pricing** - Balance between revenue and user experience
8. **Configure agent limits** - Set daily and per-transaction limits for safety
9. **Monitor payment stats** - Track payment activity regularly
10. **Use auto-approve wisely** - Only for small, trusted amounts
11. **Handle payment failures** - Implement retry logic for failed payments
12. **Verify payments** - Always verify on-chain before granting access

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Examples

Check out the `examples/` directory for complete working examples:

**Basic Examples:**
- `basic-market.ts` - Create and interact with a market
- `market-analytics.ts` - Calculate odds and probabilities

**x402 Examples:**
- `x402-micropayments.ts` - Complete x402 micropayment demo
  - Micropayments for bets
  - Pay-per-prediction model
  - AI agent configuration
  - Autonomous agent trading
  - Payment statistics

**Run Examples:**
```bash
# Install dependencies
npm install

# Run basic example
npx ts-node examples/basic-market.ts

# Run x402 example
npx ts-node examples/x402-micropayments.ts
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Documentation

- 📖 **[Complete Documentation](https://docs.polysight.bet/)** - Full SDK documentation
- 🚀 **[x402 Guide](X402_GUIDE.md)** - Comprehensive x402 payment guide
- 📝 **[Quick Start](QUICKSTART.md)** - Get started in 5 minutes
- 🛠️ **[Setup Guide](SETUP.md)** - Detailed setup instructions
- 🤝 **[Contributing](CONTRIBUTING.md)** - Contribution guidelines

## Support

- 🌐 Website: [polysight.bet](https://www.polysight.bet/)
- 📖 Docs: [docs.polysight.bet](https://docs.polysight.bet/)
- 🐦 Twitter/X: [@Polysightdotbet](https://x.com/Polysightdotbet)
- 💻 GitHub: [PolySightt](https://github.com/PolySightt)
- 🐛 Issues: [GitHub Issues](https://github.com/PolySightt/poly-sight-sdk/issues)

## Acknowledgments

Built with ❤️ by the PolySight team:
- [@PolySightt](https://github.com/PolySightt)
- [@chauahntuan185](https://github.com/chauahntuan185)

Using:
- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [Anchor Framework](https://github.com/coral-xyz/anchor)
- [TypeScript](https://www.typescriptlang.org/)
- [x402 Protocol](https://www.x402.org/)

---

**⚡ Powered by Solana's 400ms finality and x402 payment protocol**
