import * as crypto from 'crypto';
import { PublicKey } from '@solana/web3.js';
import { EncryptedData } from './types';

/**
 * Encryption utilities for privacy layer
 * Implements ChaCha20-Poly1305 and AES-256-GCM for data encryption
 */
export class PrivacyEncryption {
  /**
   * Encrypt data using ChaCha20-Poly1305
   * @param data - Data to encrypt
   * @param key - Encryption key (32 bytes)
   * @returns Encrypted data structure
   */
  static encryptChaCha20(data: Uint8Array, key: Uint8Array): EncryptedData {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for ChaCha20-Poly1305');
    }

    // Generate random nonce (12 bytes for ChaCha20-Poly1305)
    const nonce = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(
      'chacha20-poly1305',
      Buffer.from(key),
      nonce,
      { authTagLength: 16 }
    );

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine encrypted data and auth tag
    const ciphertext = Buffer.concat([encrypted, authTag]);

    return {
      ciphertext: new Uint8Array(ciphertext),
      nonce: new Uint8Array(nonce),
      algorithm: 'chacha20poly1305',
    };
  }

  /**
   * Decrypt data encrypted with ChaCha20-Poly1305
   * @param encrypted - Encrypted data structure
   * @param key - Decryption key (32 bytes)
   * @returns Decrypted data
   */
  static decryptChaCha20(encrypted: EncryptedData, key: Uint8Array): Uint8Array {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for ChaCha20-Poly1305');
    }

    if (encrypted.algorithm !== 'chacha20poly1305') {
      throw new Error('Invalid algorithm for ChaCha20 decryption');
    }

    // Split ciphertext and auth tag
    const ciphertextBuffer = Buffer.from(encrypted.ciphertext);
    const authTag = ciphertextBuffer.slice(-16);
    const ciphertext = ciphertextBuffer.slice(0, -16);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      'chacha20-poly1305',
      Buffer.from(key),
      Buffer.from(encrypted.nonce),
      { authTagLength: 16 }
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return new Uint8Array(decrypted);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param data - Data to encrypt
   * @param key - Encryption key (32 bytes)
   * @returns Encrypted data structure
   */
  static encryptAES256(data: Uint8Array, key: Uint8Array): EncryptedData {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256-GCM');
    }

    // Generate random IV (12 bytes for GCM)
    const nonce = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      nonce
    );

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine encrypted data and auth tag
    const ciphertext = Buffer.concat([encrypted, authTag]);

    return {
      ciphertext: new Uint8Array(ciphertext),
      nonce: new Uint8Array(nonce),
      algorithm: 'aes-256-gcm',
    };
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * @param encrypted - Encrypted data structure
   * @param key - Decryption key (32 bytes)
   * @returns Decrypted data
   */
  static decryptAES256(encrypted: EncryptedData, key: Uint8Array): Uint8Array {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256-GCM');
    }

    if (encrypted.algorithm !== 'aes-256-gcm') {
      throw new Error('Invalid algorithm for AES-256 decryption');
    }

    // Split ciphertext and auth tag
    const ciphertextBuffer = Buffer.from(encrypted.ciphertext);
    const authTag = ciphertextBuffer.slice(-16);
    const ciphertext = ciphertextBuffer.slice(0, -16);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      Buffer.from(encrypted.nonce)
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return new Uint8Array(decrypted);
  }

  /**
   * Encrypt data with public key (ECIES-like scheme)
   * @param data - Data to encrypt
   * @param recipientPubKey - Recipient's public key
   * @returns Encrypted data with ephemeral public key
   */
  static encryptWithPublicKey(
    data: Uint8Array,
    recipientPubKey: PublicKey
  ): EncryptedData {
    // Generate ephemeral keypair
    const ephemeralPrivKey = crypto.randomBytes(32);
    
    // Derive shared secret using ECDH
    const sharedSecret = this.deriveSharedSecret(
      ephemeralPrivKey,
      recipientPubKey.toBytes()
    );

    // Encrypt data with shared secret
    const encrypted = this.encryptChaCha20(data, sharedSecret);

    // Add ephemeral public key for recipient to derive shared secret
    const ephemeralPubKey = this.getPublicKeyFromPrivate(ephemeralPrivKey);

    return {
      ...encrypted,
      ephemeralPubKey: new Uint8Array(ephemeralPubKey),
    };
  }

  /**
   * Decrypt data with private key
   * @param encrypted - Encrypted data with ephemeral public key
   * @param privateKey - Recipient's private key
   * @returns Decrypted data
   */
  static decryptWithPrivateKey(
    encrypted: EncryptedData,
    privateKey: Uint8Array
  ): Uint8Array {
    if (!encrypted.ephemeralPubKey) {
      throw new Error('Ephemeral public key required for decryption');
    }

    // Derive shared secret using ECDH
    const sharedSecret = this.deriveSharedSecret(
      privateKey,
      encrypted.ephemeralPubKey
    );

    // Decrypt data with shared secret
    return this.decryptChaCha20(encrypted, sharedSecret);
  }

  /**
   * Derive shared secret using ECDH
   * Simplified implementation - in production use proper curve25519
   */
  private static deriveSharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): Uint8Array {
    // Mock ECDH - in production use @noble/curves or similar
    const combined = Buffer.concat([
      Buffer.from(privateKey),
      Buffer.from(publicKey),
    ]);
    
    const secret = crypto.createHash('sha256').update(combined).digest();
    return new Uint8Array(secret);
  }

  /**
   * Get public key from private key
   * Simplified implementation - in production use proper curve25519
   */
  private static getPublicKeyFromPrivate(privateKey: Uint8Array): Uint8Array {
    // Mock key derivation - in production use proper Ed25519/Curve25519
    const pubKey = crypto
      .createHash('sha256')
      .update(Buffer.from(privateKey))
      .digest();
    return new Uint8Array(pubKey);
  }

  /**
   * Generate encryption key from password using PBKDF2
   * @param password - Password string
   * @param salt - Salt (16 bytes recommended)
   * @param iterations - Number of iterations (default: 100000)
   * @returns Derived key (32 bytes)
   */
  static deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations: number = 100000
  ): Uint8Array {
    const key = crypto.pbkdf2Sync(
      password,
      Buffer.from(salt),
      iterations,
      32,
      'sha256'
    );
    return new Uint8Array(key);
  }

  /**
   * Generate random encryption key
   * @returns Random 32-byte key
   */
  static generateKey(): Uint8Array {
    return new Uint8Array(crypto.randomBytes(32));
  }

  /**
   * Generate random salt
   * @returns Random 16-byte salt
   */
  static generateSalt(): Uint8Array {
    return new Uint8Array(crypto.randomBytes(16));
  }

  /**
   * Encrypt amount for privacy-preserving transactions
   * @param amount - Amount to encrypt
   * @param key - Encryption key
   * @returns Encrypted amount
   */
  static encryptAmount(amount: number | string, key: Uint8Array): EncryptedData {
    const amountStr = amount.toString();
    const data = new Uint8Array(Buffer.from(amountStr, 'utf-8'));
    return this.encryptChaCha20(data, key);
  }

  /**
   * Decrypt amount
   * @param encrypted - Encrypted amount
   * @param key - Decryption key
   * @returns Decrypted amount as string
   */
  static decryptAmount(encrypted: EncryptedData, key: Uint8Array): string {
    const decrypted = this.decryptChaCha20(encrypted, key);
    return Buffer.from(decrypted).toString('utf-8');
  }
}
