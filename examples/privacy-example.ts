/**
 * PolySight Privacy Layer - Example Usage
 * Demonstrates zero-knowledge proof privacy features
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  PolySightPrivacyClient,
  ZKProofConfig,
  PrivacyPoolConfig,
  PrivacyLevel,
} from '../src/privacy';

async function main() {
  // 1. Setup connection and keypairs
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const user = Keypair.generate();
  const recipient = Keypair.generate();

  console.log('User Public Key:', user.publicKey.toBase58());
  console.log('Recipient Public Key:', recipient.publicKey.toBase58());

  // 2. Configure ZK-Proof settings
  const zkConfig: ZKProofConfig = {
    circuitType: 'groth16',
    hideAmount: true,
    hideAddress: true,
    hideOutcome: true,
  };

  // 3. Configure Privacy Pool
  const poolConfig: PrivacyPoolConfig = {
    minPoolSize: 10,
    maxPoolSize: 1000,
    denomination: new BN(1e9), // 1 SOL
    merkleTreeDepth: 20,
    poolAddress: new PublicKey('11111111111111111111111111111111'),
  };

  // 4. Initialize Privacy Client
  const client = new PolySightPrivacyClient(
    connection,
    zkConfig,
    poolConfig
  );

  console.log('\n=== Privacy Client Initialized ===\n');

  // 5. Set Privacy Level
  const privacyLevel: PrivacyLevel = {
    level: 'high',
    hideAmount: true,
    hideSender: true,
    hideReceiver: false,
    useMixing: true,
    minAnonymitySet: 10,
    commitmentScheme: 'poseidon',
  };

  client.setPrivacyLevel(privacyLevel);
  console.log('Privacy Level:', privacyLevel.level);
  console.log('Anonymity Set Size:', client.getAnonymitySetSize());

  // 6. Place Private Bet
  console.log('\n=== Placing Private Bet ===\n');
  
  try {
    const betResult = await client.placePrivateBet(
      'market-example-123',
      'YES',
      1.0, // 1 SOL
      user
    );

    console.log('Bet placed successfully!');
    console.log('Transaction Signature:', betResult.signature);
    
    if (betResult.privateBet) {
      console.log('Commitment:', Buffer.from(betResult.privateBet.commitment).toString('hex'));
      console.log('Proof generated at:', new Date(betResult.privateBet.timestamp));
      
      // Verify the private bet
      const isValid = await client.verifyPrivateBet(betResult.privateBet);
      console.log('Bet verification:', isValid ? '✓ Valid' : '✗ Invalid');
    }
  } catch (error) {
    console.error('Error placing private bet:', error);
  }

  // 7. Deposit to Privacy Pool
  console.log('\n=== Depositing to Privacy Pool ===\n');
  
  try {
    const depositAmount = new BN(1e9); // 1 SOL
    const depositCommitment = await client.depositToPrivacyPool(
      depositAmount,
      user
    );

    console.log('Deposit successful!');
    console.log('Commitment:', Buffer.from(depositCommitment.commitment).toString('hex'));
    console.log('New Anonymity Set Size:', client.getAnonymitySetSize());
  } catch (error) {
    console.error('Error depositing to pool:', error);
  }

  // 8. Create Private Payment
  console.log('\n=== Creating Private Payment ===\n');
  
  try {
    const paymentAmount = new BN(5e8); // 0.5 SOL
    const paymentProof = await client.createPrivatePayment(
      paymentAmount,
      recipient.publicKey,
      user
    );

    console.log('Private payment created!');
    console.log('Payment Commitment:', Buffer.from(paymentProof.commitment).toString('hex'));
    
    // Verify payment proof
    const isValidPayment = await client.verifyPrivatePayment(paymentProof);
    console.log('Payment verification:', isValidPayment ? '✓ Valid' : '✗ Invalid');
  } catch (error) {
    console.error('Error creating private payment:', error);
  }

  // 9. Private Transfer within Pool
  console.log('\n=== Private Transfer ===\n');
  
  try {
    const transferAmount = new BN(1e9); // 1 SOL
    const transferCommitment = await client.privateTransfer(
      transferAmount,
      recipient.publicKey,
      user
    );

    console.log('Private transfer successful!');
    console.log('New Commitment:', Buffer.from(transferCommitment.commitment).toString('hex'));
  } catch (error) {
    console.error('Error in private transfer:', error);
  }

  // 10. Export User Secrets (for backup)
  console.log('\n=== Exporting User Secrets ===\n');
  
  try {
    const password = 'secure-password-123';
    const encryptedSecrets = client.exportUserSecrets(user.publicKey, password);
    
    console.log('Secrets exported successfully!');
    console.log('Encrypted backup (first 50 chars):', encryptedSecrets.substring(0, 50) + '...');
    
    // Import secrets (restore from backup)
    client.importUserSecrets(user.publicKey, encryptedSecrets, password);
    console.log('Secrets imported successfully!');
  } catch (error) {
    console.error('Error with secrets:', error);
  }

  // 11. Get Privacy Statistics
  console.log('\n=== Privacy Statistics ===\n');
  
  const stats = client.getPrivacyStats();
  if (stats) {
    console.log('Total Private Transactions:', stats.totalPrivateTxs);
    console.log('Total Shielded Amount:', stats.totalShieldedAmount.toString(), 'lamports');
    console.log('Average Anonymity Set:', stats.avgAnonymitySet);
    console.log('Average Proof Time:', stats.avgProofTime, 'ms');
    console.log('Verification Success Rate:', (stats.verificationRate * 100).toFixed(2) + '%');
  }

  // 12. Check Privacy Features
  console.log('\n=== Privacy Features Status ===\n');
  
  const currentLevel = client.getPrivacyLevel();
  console.log('Current Privacy Level:', currentLevel.level);
  console.log('Amount Hidden:', currentLevel.hideAmount ? '✓' : '✗');
  console.log('Sender Hidden:', currentLevel.hideSender ? '✓' : '✗');
  console.log('Receiver Hidden:', currentLevel.hideReceiver ? '✓' : '✗');
  console.log('Mixing Enabled:', currentLevel.useMixing ? '✓' : '✗');
  console.log('Commitment Scheme:', currentLevel.commitmentScheme);

  console.log('\n=== Example Complete ===\n');
}

// Run example
main().catch(console.error);
