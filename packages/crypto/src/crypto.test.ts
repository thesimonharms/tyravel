import { describe, expect, it } from 'vitest';
import { CryptoManager } from './crypto-manager.js';
import { HybridEncryptor } from './hybrid-encryptor.js';
import { MlDsa } from './ml-dsa.js';
import { MlKem } from './ml-kem.js';
import { SlhDsa } from './slh-dsa.js';
import { serializeKeyMaterial } from './serialization.js';
import { supportsNativePqc } from './native-backend.js';

describe('@pondoknusa/crypto', () => {
  it('reports native PQC availability for the current runtime', () => {
    expect(typeof supportsNativePqc()).toBe('boolean');
  });

  it.each(['ml-kem-512', 'ml-kem-768', 'ml-kem-1024'] as const)(
    'round-trips ML-KEM encryption (%s)',
    (algorithm) => {
      const kem = new MlKem(algorithm);
      const keys = kem.generateKeyPair();
      const plaintext = new TextEncoder().encode('pondoknusa post-quantum');
      const envelope = kem.encrypt(plaintext, keys.publicKey);
      const decrypted = kem.decrypt(envelope, keys.secretKey);
      expect(decrypted).toEqual(plaintext);
    },
  );

  it('round-trips hybrid X25519 + ML-KEM-768 encryption', () => {
    const hybrid = new HybridEncryptor();
    const keys = hybrid.generateKeyPair();
    const plaintext = new TextEncoder().encode('hybrid transition mode');
    const envelope = hybrid.encrypt(plaintext, keys.publicKey);
    expect(envelope.algorithm).toBe('hybrid-x25519-ml-kem-768');
    const decrypted = hybrid.decrypt(envelope, keys.secretKey);
    expect(decrypted).toEqual(plaintext);
  });

  it.each(['ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87'] as const)(
    'signs and verifies with ML-DSA (%s)',
    (algorithm) => {
      const dsa = new MlDsa(algorithm);
      const keys = dsa.generateKeyPair();
      const message = new TextEncoder().encode('signed payload');
      const signature = dsa.sign(message, keys.secretKey);
      expect(dsa.verify(signature, message, keys.publicKey)).toBe(true);
      expect(dsa.verify(signature, new TextEncoder().encode('tampered'), keys.publicKey)).toBe(
        false,
      );
    },
  );

  it(
    'signs and verifies with SLH-DSA (sha2-128s)',
    () => {
      const dsa = new SlhDsa('slh-dsa-sha2-128s');
      const keys = dsa.generateKeyPair();
      const message = new TextEncoder().encode('hash-based signature');
      const signature = dsa.sign(message, keys.secretKey);
      expect(dsa.verify(signature, message, keys.publicKey)).toBe(true);
    },
    15_000,
  );

  it('exposes a high-level CryptoManager facade', () => {
    const crypto = new CryptoManager();
    const keys = crypto.generateKeys('hybrid-x25519-ml-kem-768');
    const envelope = crypto.encrypt('hello', keys.publicKey);
    const decrypted = crypto.decrypt(envelope, keys.secretKey);
    expect(new TextDecoder().decode(decrypted)).toBe('hello');

    const signingKeys = crypto.generateKeys('ml-dsa-65');
    const signature = crypto.sign('payload', signingKeys.secretKey);
    expect(crypto.verify(signature, 'payload', signingKeys.publicKey)).toBe(true);
  });

  it('serializes key material as base64', () => {
    const keys = new MlKem('ml-kem-768').generateKeyPair();
    const serialized = serializeKeyMaterial(keys);
    expect(serialized.algorithm).toBe('ml-kem-768');
    expect(serialized.publicKey.length).toBeGreaterThan(0);
    expect(serialized.secretKey.length).toBeGreaterThan(0);
  });
});