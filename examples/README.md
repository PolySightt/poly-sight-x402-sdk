# PolySight SDK Examples

This directory contains comprehensive examples demonstrating how to use the PolySight SDK.

## Examples

### 1. Basic Market (`basic-market.ts`)

Complete workflow for creating and managing a prediction market:
- Initialize a new market
- Place bets from multiple users
- Check market odds and information
- Resolve the market
- Claim payouts

**Run:**
```bash
ts-node examples/basic-market.ts
```

### 2. Market Analytics (`market-analytics.ts`)

Advanced analytics and calculations:
- Calculate market odds and probabilities
- Compute ROI for different bet sizes
- Analyze market liquidity
- Simulate payout scenarios

**Run:**
```bash
ts-node examples/market-analytics.ts
```

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Build the SDK:
```bash
npm run build
```

3. Install ts-node (if not already installed):
```bash
npm install -g ts-node
```

## Testing on Devnet

All examples are configured to run on Solana devnet by default. Make sure you have:

1. A stable internet connection
2. Access to Solana devnet RPC endpoints
3. Sufficient devnet SOL (examples request airdrops automatically)

## Customization

You can modify the examples to:
- Use different RPC endpoints
- Change bet amounts
- Test different market scenarios
- Integrate with your own application

## Best Practices Demonstrated

- ✅ Proper error handling
- ✅ Wallet management
- ✅ Transaction confirmation
- ✅ Market data fetching
- ✅ Odds calculation
- ✅ Payout estimation

## Need Help?

- Check the main [README](../README.md) for API documentation
- Visit our [Website](https://www.polysight.bet/) for more information
- Read the [docs](https://docs.polysight.bet/) for detailed guides
- Follow us on [Twitter/X](https://x.com/Polysightdotbet)
- Check our [GitHub](https://github.com/PolySightt)

## Contributing

Have a useful example? Submit a PR! We welcome contributions that help developers understand the SDK better.
