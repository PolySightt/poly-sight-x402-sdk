# 🚀 x402 Payment Protocol Guide

## What is x402?

**x402** is a payment protocol that implements HTTP 402 ("Payment Required") for **micropayments on Solana**. It enables:

- ⚡ **Instant micropayments** with 400ms settlement
- 💰 **Ultra-low fees** ($0.00025 per transaction)
- 🤖 **AI agent autonomous payments**
- 📊 **Pay-per-use model** (no subscriptions)
- 🔗 **Transparent on-chain** payments

## Why x402 for Prediction Markets?

PolySight SDK integrates x402 to enable:

1. **Micropayments for Small Bets**
   - Pay tiny fees for small predictions
   - No minimum bet requirements
   - Fees scale with bet size

2. **Pay-per-Prediction Model**
   - Pay only for predictions you make
   - Access market data on-demand
   - Calculate odds when needed

3. **Fast Settlement**
   - 400ms transaction finality on Solana
   - Instant bet confirmation
   - Real-time payment verification

4. **AI Agent Integration**
   - Agents can pay autonomously
   - Set spending limits
   - Auto-approve small payments

---

## 🎯 Quick Start

### 1. Install SDK

```bash
npm install @polysight/sdk @solana/web3.js
```

### 2. Initialize x402 Client

```typescript
import { Connection } from '@solana/web3.js';
import { PolySightX402Client, solToLamports } from '@polysight/sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com');

const client = new PolySightX402Client(
  connection,
  {
    baseBetFee: solToLamports(0.0001),        // 0.0001 SOL
    marketAccessFee: solToLamports(0.00005),  // 0.00005 SOL
    oddsCalculationFee: solToLamports(0.00002), // 0.00002 SOL
    predictionFee: solToLamports(0.00003),    // 0.00003 SOL
  }
);
```

### 3. Place Bet with x402 Payment

```typescript
import { Keypair, Outcome } from '@polysight/sdk';

const user = Keypair.generate();

const result = await client.placeBetWithX402(
  'my-market-id',
  Outcome.YES,
  0.1, // 0.1 SOL bet
  user,
  {
    useX402: true,
    paymentTimeout: 30000,
  }
);

console.log('Bet placed:', result.signature);
console.log('Payment:', result.paymentResponse?.signature);
```

---

## 💡 Use Cases

### 1. Micropayments for Market Access

```typescript
// Pay small fee to access market data
const market = await client.getMarketWithX402('market-id', userKeypair);
```

**Cost**: ~0.00005 SOL (~$0.005)

### 2. Pay-per-Odds Calculation

```typescript
// Pay only when you need odds
const odds = await client.getMarketOddsWithX402('market-id', userKeypair);
```

**Cost**: ~0.00002 SOL (~$0.002)

### 3. Pay-per-Prediction

```typescript
// Pay for each prediction you make
const prediction = await client.makePredictionWithX402(
  'market-id',
  Outcome.YES,
  0.75, // 75% confidence
  userKeypair
);
```

**Cost**: ~0.00003 SOL (~$0.003)

### 4. Small Bet Micropayments

```typescript
// Place small bets with proportional fees
await client.placeBetWithX402(
  'market-id',
  Outcome.YES,
  0.01, // Just 0.01 SOL
  userKeypair,
  { useX402: true }
);
```

**Fee**: ~0.0001 SOL + 0.01% of bet

---

## 🤖 AI Agent Integration

### Configure Autonomous Agent

```typescript
import { X402AgentConfig } from '@polysight/sdk';

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

client.configureAgent(agentConfig);
```

### Agent Places Bets Autonomously

```typescript
// Agent can now place bets without manual approval
const agentBet = await client.placeBetWithX402(
  'market-id',
  Outcome.YES,
  0.05,
  agentKeypair,
  { useX402: true }
);

// Payment is automatically approved if within threshold
console.log('Agent bet placed autonomously!');
```

---

## 📊 Pricing Structure

### Default Pricing

| Operation | Cost (SOL) | Cost (USD) |
|-----------|------------|------------|
| Base Bet Fee | 0.0001 | ~$0.01 |
| Market Access | 0.00005 | ~$0.005 |
| Odds Calculation | 0.00002 | ~$0.002 |
| Prediction | 0.00003 | ~$0.003 |
| Per-Dollar Bet Fee | 0.00001 | ~$0.001 |

### Custom Pricing

```typescript
// Update pricing dynamically
client.updatePricing({
  baseBetFee: solToLamports(0.0002),
  marketAccessFee: solToLamports(0.0001),
});
```

---

## 📈 Payment Statistics

### Track Payment Activity

```typescript
const stats = client.getPaymentStats();

console.log('Total Payments:', stats.totalPayments);
console.log('Successful:', stats.successfulPayments);
console.log('Failed:', stats.failedPayments);
console.log('Total Paid:', stats.totalAmountPaid.toString(), 'lamports');
console.log('Average Payment:', stats.averagePayment.toString(), 'lamports');
```

### Example Output

```
Total Payments: 25
Successful: 24
Failed: 1
Total Paid: 2500000 lamports (0.0025 SOL)
Average Payment: 100000 lamports (0.0001 SOL)
```

---

## 🔧 Advanced Features

### 1. Payment Verification

```typescript
const paymentHandler = client.getPaymentHandler();

const verification = await paymentHandler.verifyPayment(
  'transaction-signature',
  expectedAmount,
  recipientPublicKey
);

if (verification.valid) {
  console.log('Payment verified!');
} else {
  console.error('Payment invalid:', verification.error);
}
```

### 2. Custom Payment Requests

```typescript
import { X402PaymentRequest } from '@polysight/sdk';

const paymentRequest: X402PaymentRequest = {
  amount: solToLamports(0.001),
  recipient: recipientPublicKey,
  memo: 'Custom payment',
  deadline: Date.now() + 60000, // 1 minute
  currency: 'SOL',
};

const payment = await paymentHandler.createPayment(
  paymentRequest,
  payerKeypair
);
```

### 3. Payment Headers for HTTP

```typescript
// Create x402 payment header for API requests
const paymentHeader = paymentHandler.createPaymentHeader(
  paymentResponse,
  payerKeypair
);

// Use in HTTP requests
fetch('https://api.polysight.bet/protected', {
  headers: {
    'X-PAYMENT': paymentHeader.payment,
    'X-PAYMENT-SIGNATURE': paymentHeader.signature,
  },
});
```

---

## 🌟 Benefits

### For Users

- ✅ **No Subscriptions** - Pay only for what you use
- ✅ **Transparent Costs** - All fees visible on-chain
- ✅ **Instant Settlement** - 400ms confirmation
- ✅ **Low Fees** - Fraction of a cent per operation

### For Developers

- ✅ **Easy Integration** - Simple API
- ✅ **Flexible Pricing** - Customize fee structure
- ✅ **AI Agent Ready** - Built-in autonomous payment support
- ✅ **Statistics** - Track all payment activity

### For AI Agents

- ✅ **Autonomous Payments** - No human intervention needed
- ✅ **Spending Limits** - Daily and per-transaction caps
- ✅ **Auto-Approve** - Small payments approved automatically
- ✅ **Audit Trail** - All payments tracked on-chain

---

## 📚 Examples

### Example 1: Simple Micropayment Bet

```typescript
const result = await client.placeBetWithX402(
  'btc-100k',
  Outcome.YES,
  0.05,
  userKeypair,
  { useX402: true }
);
```

### Example 2: Agent Trading Strategy

```typescript
// Configure agent
client.configureAgent({
  agentWallet: agent.publicKey,
  maxPaymentPerTx: solToLamports(0.1),
  dailyLimit: solToLamports(10),
  autoApproveThreshold: solToLamports(0.01),
  autonomous: true,
});

// Agent executes strategy
for (const market of markets) {
  const odds = await client.getMarketOddsWithX402(market.id, agent);
  
  if (odds.yesPrice < 0.3) {
    // Undervalued, place bet
    await client.placeBetWithX402(
      market.id,
      Outcome.YES,
      0.1,
      agent,
      { useX402: true }
    );
  }
}
```

### Example 3: Pay-per-Prediction Service

```typescript
// User pays for each prediction
const prediction = await client.makePredictionWithX402(
  'election-2024',
  Outcome.YES,
  0.85, // 85% confidence
  userKeypair
);

console.log('Prediction:', prediction.prediction);
console.log('Expected Value:', prediction.expectedValue);
console.log('Cost:', prediction.paymentResponse.amount.toString());
```

---

## 🔗 Resources

- **x402 Protocol**: https://www.x402.org/
- **Solana x402**: https://solana.com/x402
- **PolySight Docs**: https://docs.polysight.bet/
- **GitHub**: https://github.com/PolySightt/poly-sight-sdk

---

## 💬 Support

- 🌐 Website: [polysight.bet](https://www.polysight.bet/)
- 📖 Docs: [docs.polysight.bet](https://docs.polysight.bet/)
- 🐦 Twitter: [@Polysightdotbet](https://x.com/Polysightdotbet)
- 💻 GitHub: [PolySightt](https://github.com/PolySightt)

---

**Built with ❤️ by the PolySight Team**

*Powered by Solana's 400ms finality and $0.00025 transaction fees*
