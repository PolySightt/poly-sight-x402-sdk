/**
 * ZK-Proof Generator Tests
 */

import BN from 'bn.js';
import { ZKProofGenerator } from '../zkproof';
import { ZKProofConfig } from '../types';

describe('ZKProofGenerator', () => {
  let generator: ZKProofGenerator;
  const config: ZKProofConfig = {
    circuitType: 'groth16',
    hideAmount: true,
    hideAddress: true,
  };

  beforeEach(() => {
    generator = new ZKProofGenerator(config, 'poseidon');
  });

  describe('Commitment Generation', () => {
    it('should generate a valid commitment', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const commitment = await generator.generateCommitment(input);
      
      expect(commitment).toBeDefined();
      expect(commitment).toBeInstanceOf(Uint8Array);
      expect(commitment.length).toBe(32);
    });

    it('should generate different commitments for different inputs', async () => {
      const input1 = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const input2 = {
        amount: new BN(2000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const commitment1 = await generator.generateCommitment(input1);
      const commitment2 = await generator.generateCommitment(input2);

      expect(Buffer.from(commitment1).toString('hex')).not.toBe(
        Buffer.from(commitment2).toString('hex')
      );
    });

    it('should generate same commitment for same inputs', async () => {
      const secret = ZKProofGenerator.generateSecret();
      const nullifier = ZKProofGenerator.generateNullifier();
      
      const input = {
        amount: new BN(1000000),
        secret,
        nullifier,
      };

      const commitment1 = await generator.generateCommitment(input);
      const commitment2 = await generator.generateCommitment(input);

      expect(Buffer.from(commitment1).toString('hex')).toBe(
        Buffer.from(commitment2).toString('hex')
      );
    });
  });

  describe('Nullifier Generation', () => {
    it('should generate a valid nullifier', async () => {
      const secret = ZKProofGenerator.generateSecret();
      const commitment = new Uint8Array(32);

      const nullifier = await generator.generateNullifier(secret, commitment);

      expect(nullifier).toBeDefined();
      expect(nullifier).toBeInstanceOf(Uint8Array);
      expect(nullifier.length).toBe(32);
    });

    it('should generate different nullifiers for different secrets', async () => {
      const secret1 = ZKProofGenerator.generateSecret();
      const secret2 = ZKProofGenerator.generateSecret();
      const commitment = new Uint8Array(32);

      const nullifier1 = await generator.generateNullifier(secret1, commitment);
      const nullifier2 = await generator.generateNullifier(secret2, commitment);

      expect(Buffer.from(nullifier1).toString('hex')).not.toBe(
        Buffer.from(nullifier2).toString('hex')
      );
    });
  });

  describe('Proof Generation', () => {
    it('should generate a valid ZK-proof', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const proof = await generator.generateProof(input, ['public-input-1']);

      expect(proof).toBeDefined();
      expect(proof.proof).toBeInstanceOf(Uint8Array);
      expect(proof.publicSignals).toBeInstanceOf(Array);
      expect(proof.protocol).toBe('groth16');
      expect(proof.timestamp).toBeGreaterThan(0);
    });

    it('should include public signals in proof', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const publicInputs = ['market-123', 'YES'];
      const proof = await generator.generateProof(input, publicInputs);

      expect(proof.publicSignals.length).toBeGreaterThanOrEqual(publicInputs.length);
    });
  });

  describe('Proof Verification', () => {
    it('should verify a valid proof', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const proof = await generator.generateProof(input);
      const verification = await generator.verifyProof(proof);

      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
    });

    it('should reject proof with wrong protocol', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const proof = await generator.generateProof(input);
      proof.protocol = 'plonk'; // Change protocol

      const verification = await generator.verifyProof(proof);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Protocol mismatch');
    });

    it('should verify public signals match', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const publicInputs = ['market-123'];
      const proof = await generator.generateProof(input, publicInputs);
      
      const verification = await generator.verifyProof(proof, proof.publicSignals);

      expect(verification.valid).toBe(true);
    });
  });

  describe('Proof Serialization', () => {
    it('should serialize and deserialize proof', async () => {
      const input = {
        amount: new BN(1000000),
        secret: ZKProofGenerator.generateSecret(),
        nullifier: ZKProofGenerator.generateNullifier(),
      };

      const proof = await generator.generateProof(input);
      const serialized = ZKProofGenerator.serializeProof(proof);
      const deserialized = ZKProofGenerator.deserializeProof(serialized);

      expect(deserialized.protocol).toBe(proof.protocol);
      expect(deserialized.timestamp).toBe(proof.timestamp);
      expect(deserialized.publicSignals).toEqual(proof.publicSignals);
    });
  });

  describe('Helper Functions', () => {
    it('should generate random secret', () => {
      const secret1 = ZKProofGenerator.generateSecret();
      const secret2 = ZKProofGenerator.generateSecret();

      expect(secret1).toBeInstanceOf(Uint8Array);
      expect(secret1.length).toBe(32);
      expect(Buffer.from(secret1).toString('hex')).not.toBe(
        Buffer.from(secret2).toString('hex')
      );
    });

    it('should generate random nullifier', () => {
      const nullifier1 = ZKProofGenerator.generateNullifier();
      const nullifier2 = ZKProofGenerator.generateNullifier();

      expect(nullifier1).toBeInstanceOf(Uint8Array);
      expect(nullifier1.length).toBe(32);
      expect(Buffer.from(nullifier1).toString('hex')).not.toBe(
        Buffer.from(nullifier2).toString('hex')
      );
    });
  });
});
