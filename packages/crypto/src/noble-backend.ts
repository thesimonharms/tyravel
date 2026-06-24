import { ml_kem512, ml_kem768, ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import {
  slh_dsa_sha2_128f,
  slh_dsa_sha2_128s,
  slh_dsa_sha2_192f,
  slh_dsa_sha2_192s,
  slh_dsa_sha2_256f,
  slh_dsa_sha2_256s,
} from '@noble/post-quantum/slh-dsa.js';
import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import type {
  DsaAlgorithm,
  EncapsulationResult,
  KemAlgorithm,
  KeyMaterial,
  SlhDsaAlgorithm,
} from './types.js';

type KemImpl = {
  keygen: (seed?: Uint8Array) => { publicKey: Uint8Array; secretKey: Uint8Array };
  encapsulate: (publicKey: Uint8Array) => { cipherText: Uint8Array; sharedSecret: Uint8Array };
  decapsulate: (ciphertext: Uint8Array, secretKey: Uint8Array) => Uint8Array;
};

type DsaImpl = {
  keygen: (seed?: Uint8Array) => { publicKey: Uint8Array; secretKey: Uint8Array };
  sign: (message: Uint8Array, secretKey: Uint8Array) => Uint8Array;
  verify: (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array) => boolean;
};

const KEM_ALGORITHMS: Record<KemAlgorithm, KemImpl> = {
  'ml-kem-512': ml_kem512,
  'ml-kem-768': ml_kem768,
  'ml-kem-1024': ml_kem1024,
};

const DSA_ALGORITHMS: Record<DsaAlgorithm, DsaImpl> = {
  'ml-dsa-44': ml_dsa44,
  'ml-dsa-65': ml_dsa65,
  'ml-dsa-87': ml_dsa87,
};

const SLH_DSA_ALGORITHMS: Record<SlhDsaAlgorithm, DsaImpl> = {
  'slh-dsa-sha2-128f': slh_dsa_sha2_128f,
  'slh-dsa-sha2-128s': slh_dsa_sha2_128s,
  'slh-dsa-sha2-192f': slh_dsa_sha2_192f,
  'slh-dsa-sha2-192s': slh_dsa_sha2_192s,
  'slh-dsa-sha2-256f': slh_dsa_sha2_256f,
  'slh-dsa-sha2-256s': slh_dsa_sha2_256s,
};

export function nobleGenerateKemKeyPair(algorithm: KemAlgorithm, seed?: Uint8Array): KeyMaterial {
  const impl = KEM_ALGORITHMS[algorithm];
  const keys = impl.keygen(seed);
  return {
    algorithm,
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };
}

export function nobleGenerateHybridKeyPair(seed?: Uint8Array): KeyMaterial {
  const keys = ml_kem768_x25519.keygen(seed);
  return {
    algorithm: 'hybrid-x25519-ml-kem-768',
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };
}

export function nobleEncapsulate(
  algorithm: KemAlgorithm,
  publicKey: Uint8Array,
): EncapsulationResult {
  const result = KEM_ALGORITHMS[algorithm].encapsulate(publicKey);
  return {
    ciphertext: result.cipherText,
    sharedSecret: result.sharedSecret,
  };
}

export function nobleHybridEncapsulate(publicKey: Uint8Array): EncapsulationResult {
  const result = ml_kem768_x25519.encapsulate(publicKey);
  return {
    ciphertext: result.cipherText,
    sharedSecret: result.sharedSecret,
  };
}

export function nobleDecapsulate(
  algorithm: KemAlgorithm,
  ciphertext: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  return KEM_ALGORITHMS[algorithm].decapsulate(ciphertext, secretKey);
}

export function nobleHybridDecapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return ml_kem768_x25519.decapsulate(ciphertext, secretKey);
}

export function nobleGenerateDsaKeyPair(algorithm: DsaAlgorithm, seed?: Uint8Array): KeyMaterial {
  const impl = DSA_ALGORITHMS[algorithm];
  const keys = impl.keygen(seed);
  return {
    algorithm,
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };
}

export function nobleGenerateSlhDsaKeyPair(
  algorithm: SlhDsaAlgorithm,
  seed?: Uint8Array,
): KeyMaterial {
  const impl = SLH_DSA_ALGORITHMS[algorithm];
  const keys = impl.keygen(seed);
  return {
    algorithm,
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
  };
}

export function nobleSign(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  message: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  const impl = isSlhDsaAlgorithm(algorithm)
    ? SLH_DSA_ALGORITHMS[algorithm]
    : DSA_ALGORITHMS[algorithm];
  return impl.sign(message, secretKey);
}

export function nobleVerify(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  const impl = isSlhDsaAlgorithm(algorithm)
    ? SLH_DSA_ALGORITHMS[algorithm]
    : DSA_ALGORITHMS[algorithm];
  return impl.verify(signature, message, publicKey);
}

function isSlhDsaAlgorithm(algorithm: DsaAlgorithm | SlhDsaAlgorithm): algorithm is SlhDsaAlgorithm {
  return algorithm.startsWith('slh-dsa-');
}