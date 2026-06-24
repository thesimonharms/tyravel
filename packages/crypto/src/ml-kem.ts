import {
  decapsulate,
  encapsulate,
  generateKemKeyPair,
  encryptWithSharedSecret,
  decryptWithSharedSecret,
  resolveKemBackend,
} from './backend.js';
import type {
  CryptoBackend,
  EncryptedEnvelope,
  KemAlgorithm,
  KemKeyPair,
  KeyMaterial,
} from './types.js';

export class MlKem {
  constructor(
    readonly algorithm: KemAlgorithm,
    private readonly preferNative = true,
  ) {}

  generateKeyPair(seed?: Uint8Array): KemKeyPair {
    return generateKemKeyPair(this.algorithm, seed, { preferNative: this.preferNative }) as KemKeyPair;
  }

  encapsulate(publicKey: Uint8Array) {
    return encapsulate(this.algorithm, publicKey, { preferNative: this.preferNative });
  }

  decapsulate(ciphertext: Uint8Array, secretKey: Uint8Array, backend: CryptoBackend): Uint8Array {
    return decapsulate(this.algorithm, ciphertext, secretKey, backend);
  }

  encrypt(plaintext: Uint8Array, recipientPublicKey: Uint8Array): EncryptedEnvelope {
    const backend = resolveKemBackend(this.algorithm, { preferNative: this.preferNative });
    const { ciphertext: kemCiphertext, sharedSecret } = this.encapsulate(recipientPublicKey);
    const encrypted = encryptWithSharedSecret(sharedSecret, plaintext);
    return {
      version: 1,
      algorithm: this.algorithm,
      backend,
      kemCiphertext,
      ...encrypted,
    };
  }

  decrypt(envelope: EncryptedEnvelope, secretKey: Uint8Array): Uint8Array {
    const sharedSecret = this.decapsulate(envelope.kemCiphertext, secretKey, envelope.backend);
    return decryptWithSharedSecret(
      sharedSecret,
      envelope.iv,
      envelope.ciphertext,
      envelope.tag,
    );
  }
}

export function isKemAlgorithm(algorithm: string): algorithm is KemAlgorithm {
  return algorithm === 'ml-kem-512' || algorithm === 'ml-kem-768' || algorithm === 'ml-kem-1024';
}

export function createKemKeyPair(algorithm: KemAlgorithm, seed?: Uint8Array): KeyMaterial {
  return generateKemKeyPair(algorithm, seed);
}