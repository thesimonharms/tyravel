import {
  nobleDecapsulate,
  nobleEncapsulate,
  nobleGenerateDsaKeyPair,
  nobleGenerateHybridKeyPair,
  nobleGenerateKemKeyPair,
  nobleGenerateSlhDsaKeyPair,
  nobleHybridDecapsulate,
  nobleHybridEncapsulate,
  nobleSign,
  nobleVerify,
} from './noble-backend.js';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  nativeDecapsulate,
  nativeEncapsulate,
  nativeGenerateDsaKeyPair,
  nativeGenerateKemKeyPair,
  nativeSign,
  nativeVerify,
  supportsNativeDsa,
  supportsNativeKem,
} from './native-backend.js';
import type {
  CryptoBackend,
  DsaAlgorithm,
  EncapsulationResult,
  EncryptedEnvelope,
  KemAlgorithm,
  KeyMaterial,
  SlhDsaAlgorithm,
} from './types.js';

export interface BackendOptions {
  preferNative?: boolean;
}

export function resolveKemBackend(
  algorithm: KemAlgorithm,
  options: BackendOptions = {},
): CryptoBackend {
  if (options.preferNative !== false && supportsNativeKem(algorithm)) {
    return 'native';
  }
  return 'noble';
}

export function resolveDsaBackend(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  options: BackendOptions = {},
): CryptoBackend {
  if (options.preferNative !== false && supportsNativeDsa(algorithm)) {
    return 'native';
  }
  return 'noble';
}

export function generateKemKeyPair(
  algorithm: KemAlgorithm,
  seed?: Uint8Array,
  options: BackendOptions = {},
): KeyMaterial {
  const backend = resolveKemBackend(algorithm, options);
  if (backend === 'native') {
    return nativeGenerateKemKeyPair(algorithm);
  }
  return nobleGenerateKemKeyPair(algorithm, seed);
}

export function generateHybridKeyPair(
  seed?: Uint8Array,
  _options: BackendOptions = {},
): KeyMaterial {
  // Hybrid KEM uses noble's combined X25519 + ML-KEM-768 construction.
  return nobleGenerateHybridKeyPair(seed);
}

export function encapsulate(
  algorithm: KemAlgorithm,
  publicKey: Uint8Array,
  options: BackendOptions = {},
): EncapsulationResult {
  const backend = resolveKemBackend(algorithm, options);
  if (backend === 'native') {
    return nativeEncapsulate(algorithm, publicKey);
  }
  return nobleEncapsulate(algorithm, publicKey);
}

export function hybridEncapsulate(publicKey: Uint8Array): EncapsulationResult {
  return nobleHybridEncapsulate(publicKey);
}

export function decapsulate(
  algorithm: KemAlgorithm,
  ciphertext: Uint8Array,
  secretKey: Uint8Array,
  backend: CryptoBackend,
): Uint8Array {
  if (backend === 'native') {
    return nativeDecapsulate(algorithm, ciphertext, secretKey);
  }
  return nobleDecapsulate(algorithm, ciphertext, secretKey);
}

export function hybridDecapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nobleHybridDecapsulate(ciphertext, secretKey);
}

export function generateDsaKeyPair(
  algorithm: DsaAlgorithm,
  seed?: Uint8Array,
  options: BackendOptions = {},
): KeyMaterial {
  const backend = resolveDsaBackend(algorithm, options);
  if (backend === 'native') {
    return nativeGenerateDsaKeyPair(algorithm);
  }
  return nobleGenerateDsaKeyPair(algorithm, seed);
}

export function generateSlhDsaKeyPair(
  algorithm: SlhDsaAlgorithm,
  seed?: Uint8Array,
  options: BackendOptions = {},
): KeyMaterial {
  const backend = resolveDsaBackend(algorithm, options);
  if (backend === 'native') {
    return nativeGenerateDsaKeyPair(algorithm);
  }
  return nobleGenerateSlhDsaKeyPair(algorithm, seed);
}

export function signMessage(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  message: Uint8Array,
  secretKey: Uint8Array,
  backend: CryptoBackend,
): Uint8Array {
  if (backend === 'native') {
    return nativeSign(algorithm, message, secretKey);
  }
  return nobleSign(algorithm, message, secretKey);
}

export function verifyMessage(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
  backend: CryptoBackend,
): boolean {
  if (backend === 'native') {
    return nativeVerify(algorithm, signature, message, publicKey);
  }
  return nobleVerify(algorithm, signature, message, publicKey);
}

export function encryptWithSharedSecret(
  sharedSecret: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): Pick<EncryptedEnvelope, 'iv' | 'ciphertext' | 'tag'> {
  return aesGcmEncrypt(sharedSecret, plaintext, aad);
}

export function decryptWithSharedSecret(
  sharedSecret: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array,
): Uint8Array {
  return aesGcmDecrypt(sharedSecret, iv, ciphertext, tag, aad);
}