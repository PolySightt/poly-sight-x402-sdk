# PolySight Privacy Layer Documentation

## Overview

The PolySight Privacy Layer implements zero-knowledge proofs (ZK-SNARKs) to enable privacy-preserving transactions on Solana. This layer allows users to place bets, make payments, and transfer funds while keeping transaction details private.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Privacy Levels](#privacy-levels)
4. [Best Practices](#best-practices)
5. [Security Considerations](#security-considerations)
6. [API Reference](#api-reference)

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│              PolySightPrivacyClient                     │
│  - Place private bets                                   │
│  - Create private payments                              │
│  - Manage privacy pools                                 │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼───────────┐
│ ZKProofGen   │  │  PrivacyPool     │
│              │  │                  │
│ - Groth16    │  │ - Deposit        │
│ - PLONK      │  │ - Withdraw       │
│ - Poseidon   │  │ - Transfer       │
│ - Pedersen   │  │ - Merkle Tree    │
└───────┬──────┘  └──────┬───────────┘
        │                │
        │         ┌──────▼───────────┐
        │         │  Encryption      │
        │         │                  │
        │         │ - ChaCha20       │
        │         │ - AES-256        │
        │         │ - ECIES          │
        │         └──────────────────┘
        │
┌───────▼──────────────────────────┐
│  Commitment Schemes              │
│  - Poseidon (recommended)        │
│  - Pedersen                      │
│  - SHA256                        │
└──────────────────────────────────┘
```

## Core Components

### 1. ZK-Proof Generator

Generates and verifies zero-knowledge proofs for private transactions.

**Features:**
- Support for Groth16 and PLONK protocols
- Multiple commitment schemes (Poseidon, Pedersen, SHA256)
- Efficient proof generation and verification
- Public signal management

**Usage:**
```typescript
import { ZKProofGenerator } from '@polysight/sdk';

const generator = new ZKProofGenerator({
  circuitType: 'groth16',
  hideAmount: true,
  hideAddress: true,
}, 'poseidon');

const proof = await generator.generateProof({
  amount: new BN(1e9),
  secret: secret,
  nullifier: nullifier,
}, [publicInput]);
```

### 2. Privacy Pool

Implements mixing pools for anonymous transactions with merkle tree anonymity sets.

**Features:**
- Fixed denomination mixing
- Merkle tree for anonymity sets
- Nullifier-based double-spend prevention
- Configurable pool sizes

**Usage:**
```typescript
import { PrivacyPool } from '@polysight/sdk';

const pool = new PrivacyPool(connection, {
  minPoolSize: 10,
  maxPoolSize: 1000,
  denomination: new BN(1e9),
  merkleTreeDepth: 20,
  poolAddress: poolPubKey,
});

const commitment = await pool.deposit(amount, user);
```

### 3. Encryption Layer

Provides authenticated encryption for transaction data.

**Features:**
- ChaCha20-Poly1305 (recommended for performance)
- AES-256-GCM (industry standard)
- ECIES-like public key encryption
- PBKDF2 key derivation

**Usage:**
```typescript
import { PrivacyEncryption } from '@polysight/sdk';

const key = PrivacyEncryption.generateKey();
const encrypted = PrivacyEncryption.encryptChaCha20(data, key);
const decrypted = PrivacyEncryption.decryptChaCha20(encrypted, key);
```

### 4. Privacy Client

Main client interface extending X402 client with privacy features.

**Features:**
- Private bet placement
- Private payments
- Privacy pool management
- Secret backup/restore
- Configurable privacy levels

## Privacy Levels

### Low Privacy
- Hides sender address only
- Transaction amounts visible
- Fast and cheap
- Suitable for small transactions

```typescript
client.setPrivacyLevel({
  level: 'low',
  hideAmount: false,
  hideSender: true,
  hideReceiver: false,
  useMixing: false,
  minAnonymitySet: 5,
  commitmentScheme: 'sha256',
});
```

### Medium Privacy
- Hides sender and amount
- Receiver visible
- Moderate cost
- Good for regular transactions

```typescript
client.setPrivacyLevel({
  level: 'medium',
  hideAmount: true,
  hideSender: true,
  hideReceiver: false,
  useMixing: false,
  minAnonymitySet: 10,
  commitmentScheme: 'poseidon',
});
```

### High Privacy
- Hides sender, amount, and uses mixing
- Large anonymity sets
- Higher cost
- Recommended for sensitive transactions

```typescript
client.setPrivacyLevel({
  level: 'high',
  hideAmount: true,
  hideSender: true,
  hideReceiver: false,
  useMixing: true,
  minAnonymitySet: 20,
  commitmentScheme: 'poseidon',
});
```

### Maximum Privacy
- Full privacy with maximum anonymity
- All details hidden
- Highest cost
- For maximum security needs

```typescript
client.setPrivacyLevel({
  level: 'maximum',
  hideAmount: true,
  hideSender: true,
  hideReceiver: true,
  useMixing: true,
  minAnonymitySet: 50,
  commitmentScheme: 'poseidon',
});
```

## Best Practices

### 1. Secret Management
- **Always backup user secrets** using `exportUserSecrets()`
- Store encrypted backups in secure locations
- Use strong passwords for encryption
- Never share secrets or nullifiers

### 2. Anonymity Sets
- Wait for minimum anonymity set size before withdrawing
- Larger anonymity sets provide better privacy
- Monitor pool size with `getAnonymitySetSize()`
- Recommended minimum: 10 participants

### 3. Commitment Schemes
- **Use Poseidon** for on-chain efficiency (recommended)
- Pedersen for compatibility with other systems
- SHA256 for maximum compatibility (slower)

### 4. Proof Generation
- Generate proofs off-chain when possible
- Cache verification keys
- Monitor proof generation time
- Use Groth16 for smaller proof sizes

### 5. Transaction Timing
- Avoid predictable transaction patterns
- Use random delays between transactions
- Mix with other users' transactions
- Don't withdraw immediately after deposit

## Security Considerations

### Cryptographic Security

1. **ZK-SNARK Security**
   - Proofs are computationally sound
   - Requires trusted setup (Groth16) or universal setup (PLONK)
   - Verify all proofs before accepting

2. **Commitment Security**
   - Commitments are computationally hiding and binding
   - Poseidon hash optimized for ZK circuits
   - Collision resistance critical

3. **Nullifier Security**
   - Prevents double-spending
   - Must be unique per commitment
   - Stored on-chain to prevent reuse

### Operational Security

1. **Secret Storage**
   - Encrypt secrets at rest
   - Use hardware wallets when possible
   - Implement secure backup procedures
   - Regular security audits

2. **Network Security**
   - Use secure RPC endpoints
   - Verify transaction finality
   - Monitor for chain reorganizations
   - Implement retry logic

3. **Privacy Leaks**
   - Avoid timing correlations
   - Use Tor or VPN for network privacy
   - Don't reuse addresses
   - Monitor metadata leakage

## API Reference

### PolySightPrivacyClient

#### Constructor
```typescript
new PolySightPrivacyClient(
  connection: Connection,
  zkConfig?: ZKProofConfig,
  privacyPoolConfig?: PrivacyPoolConfig,
  config?: any
)
```

#### Methods

**placePrivateBet**
```typescript
async placePrivateBet(
  marketId: string,
  outcome: Outcome,
  amount: number | BN,
  user: Keypair
): Promise<TransactionResult & { privateBet?: PrivateBetCommitment }>
```

**createPrivatePayment**
```typescript
async createPrivatePayment(
  amount: BN,
  recipient: PublicKey,
  payer: Keypair
): Promise<PrivatePaymentProof>
```

**depositToPrivacyPool**
```typescript
async depositToPrivacyPool(
  amount: BN,
  depositor: Keypair
): Promise<PrivateBetCommitment>
```

**withdrawFromPrivacyPool**
```typescript
async withdrawFromPrivacyPool(
  commitment: Uint8Array,
  recipient: PublicKey,
  user: Keypair
): Promise<ShieldedTransaction>
```

**privateTransfer**
```typescript
async privateTransfer(
  amount: BN,
  recipient: PublicKey,
  sender: Keypair
): Promise<PrivateBetCommitment>
```

**setPrivacyLevel**
```typescript
setPrivacyLevel(level: PrivacyLevel): void
```

**exportUserSecrets**
```typescript
exportUserSecrets(user: PublicKey, password: string): string
```

**importUserSecrets**
```typescript
importUserSecrets(
  user: PublicKey,
  encryptedSecrets: string,
  password: string
): void
```

**getPrivacyStats**
```typescript
getPrivacyStats(): PrivacyStats | undefined
```

**getAnonymitySetSize**
```typescript
getAnonymitySetSize(): number
```

## Performance Considerations

### Proof Generation
- Groth16: ~2-5 seconds per proof
- PLONK: ~5-10 seconds per proof
- Poseidon hash: ~10ms per hash
- Merkle proof: ~50ms per proof

### Transaction Costs
- Base transaction: ~5,000 lamports
- ZK-Proof verification: ~280,000 compute units (Groth16)
- Privacy pool deposit: ~10,000 lamports
- Privacy pool withdraw: ~15,000 lamports

### Optimization Tips
1. Batch proof generation
2. Cache verification keys
3. Use Poseidon for on-chain operations
4. Minimize public inputs
5. Optimize circuit design

## Roadmap

- [ ] Hardware wallet integration
- [ ] Mobile SDK support
- [ ] Advanced circuit optimizations
- [ ] Cross-chain privacy bridges
- [ ] Recursive proof composition
- [ ] Trusted setup ceremony tools
- [ ] Privacy-preserving oracles
- [ ] Compliance features (selective disclosure)

## Support

For questions or issues:
- GitHub: https://github.com/PolySightt/poly-sight-sdk
- Documentation: https://docs.polysight.io
- Discord: https://discord.gg/polysight

## License

MIT License - see LICENSE file for details
