# PolySight Privacy Layer - Zero-Knowledge Proof Implementation

Complete privacy-preserving transaction system for Solana prediction markets.

## Features

- ZK-SNARK proofs (Groth16 and PLONK)
- Privacy pools for anonymous transactions
- Commitment schemes (Poseidon, Pedersen, SHA256)
- ChaCha20-Poly1305 and AES-256-GCM encryption
- Nullifier-based double-spend prevention
- Merkle tree anonymity sets
- Configurable privacy levels

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { PolySightPrivacyClient } from '@polysight/sdk';

const connection = new Connection('https://api.devnet.solana.com');
const user = Keypair.generate();

const client = new PolySightPrivacyClient(
  connection,
  { circuitType: 'groth16', hideAmount: true },
  { minPoolSize: 10, maxPoolSize: 1000, denomination: new BN(1e9) }
);

// Place private bet
const result = await client.placePrivateBet(
  'market-123',
  'YES',
  1.0,
  user
);
```

## Privacy Levels

- **Low**: Hide sender only
- **Medium**: Hide sender and amount
- **High**: Hide sender, amount, use mixing
- **Maximum**: Full privacy with large anonymity sets

## Best Practices

1. Always backup user secrets
2. Use minimum anonymity set of 10+
3. Enable mixing for high-value transactions
4. Verify proofs before broadcasting
5. Use Poseidon hash for on-chain efficiency

## Security Considerations

- Secrets must be stored securely
- Nullifiers prevent double-spending
- Merkle proofs ensure commitment validity
- Encryption keys should be derived from passwords
- Regular security audits recommended
