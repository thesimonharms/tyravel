import { toUtf8Bytes } from './encoding.js';
import { HybridEncryptor } from './hybrid-encryptor.js';
import { isKemAlgorithm, MlKem } from './ml-kem.js';
import { isMlDsaAlgorithm, MlDsa } from './ml-dsa.js';
import { isHybridAlgorithm } from './hybrid-encryptor.js';
import { isSlhDsaAlgorithm, SlhDsa } from './slh-dsa.js';
import { generateDsaKeyPair, generateKemKeyPair, generateSlhDsaKeyPair, generateHybridKeyPair } from './backend.js';
import type {
  CryptoAlgorithm,
  CryptoConfig,
  DsaAlgorithm,
  EncryptedEnvelope,
  KemAlgorithm,
  KeyMaterial,
  SlhDsaAlgorithm,
} from './types.js';
import { DEFAULT_CRYPTO_CONFIG } from './types.js';

type ResolvedCryptoConfig = Required<Pick<CryptoConfig, 'kem' | 'signature' | 'preferNative'>> &
  CryptoConfig;

export class CryptoManager {
  private readonly config: ResolvedCryptoConfig;

  constructor(config: CryptoConfig = {}) {
    this.config = { ...DEFAULT_CRYPTO_CONFIG, ...config };
  }

  generateKeys(algorithm: CryptoAlgorithm, seed?: Uint8Array): KeyMaterial {
    if (isHybridAlgorithm(algorithm)) {
      return generateHybridKeyPair(seed, { preferNative: this.config.preferNative });
    }
    if (isKemAlgorithm(algorithm)) {
      return generateKemKeyPair(algorithm, seed, { preferNative: this.config.preferNative });
    }
    if (isMlDsaAlgorithm(algorithm)) {
      return generateDsaKeyPair(algorithm, seed, { preferNative: this.config.preferNative });
    }
    if (isSlhDsaAlgorithm(algorithm)) {
      return generateSlhDsaKeyPair(algorithm, seed, { preferNative: this.config.preferNative });
    }

    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  encrypt(
    plaintext: Uint8Array | string,
    recipientPublicKey: Uint8Array,
    algorithm: KemAlgorithm | 'hybrid-x25519-ml-kem-768' = this.config.kem,
  ): EncryptedEnvelope {
    const payload = typeof plaintext === 'string' ? toUtf8Bytes(plaintext) : plaintext;
    if (isHybridAlgorithm(algorithm)) {
      return new HybridEncryptor(this.config.preferNative).encrypt(payload, recipientPublicKey);
    }
    if (isKemAlgorithm(algorithm)) {
      return new MlKem(algorithm, this.config.preferNative).encrypt(payload, recipientPublicKey);
    }
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }

  decrypt(envelope: EncryptedEnvelope, secretKey: Uint8Array): Uint8Array {
    if (isHybridAlgorithm(envelope.algorithm)) {
      return new HybridEncryptor(this.config.preferNative).decrypt(envelope, secretKey);
    }
    if (isKemAlgorithm(envelope.algorithm)) {
      return new MlKem(envelope.algorithm, this.config.preferNative).decrypt(envelope, secretKey);
    }
    throw new Error(`Unsupported envelope algorithm: ${envelope.algorithm}`);
  }

  sign(
    message: Uint8Array | string,
    secretKey: Uint8Array,
    algorithm: DsaAlgorithm | SlhDsaAlgorithm = this.config.signature,
  ): Uint8Array {
    const payload = typeof message === 'string' ? toUtf8Bytes(message) : message;
    if (isMlDsaAlgorithm(algorithm)) {
      return new MlDsa(algorithm, this.config.preferNative).sign(payload, secretKey);
    }
    if (isSlhDsaAlgorithm(algorithm)) {
      return new SlhDsa(algorithm, this.config.preferNative).sign(payload, secretKey);
    }
    throw new Error(`Unsupported signature algorithm: ${algorithm}`);
  }

  verify(
    signature: Uint8Array,
    message: Uint8Array | string,
    publicKey: Uint8Array,
    algorithm: DsaAlgorithm | SlhDsaAlgorithm = this.config.signature,
  ): boolean {
    const payload = typeof message === 'string' ? toUtf8Bytes(message) : message;
    if (isMlDsaAlgorithm(algorithm)) {
      return new MlDsa(algorithm, this.config.preferNative).verify(signature, payload, publicKey);
    }
    if (isSlhDsaAlgorithm(algorithm)) {
      return new SlhDsa(algorithm, this.config.preferNative).verify(signature, payload, publicKey);
    }
    throw new Error(`Unsupported signature algorithm: ${algorithm}`);
  }
}