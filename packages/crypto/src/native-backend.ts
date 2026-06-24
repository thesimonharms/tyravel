import * as nodeCrypto from 'node:crypto';
import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import type {
  DsaAlgorithm,
  EncapsulationResult,
  KemAlgorithm,
  KeyMaterial,
  SlhDsaAlgorithm,
} from './types.js';

type NativeKemCrypto = {
  encapsulate: (publicKey: KeyObject) => { ciphertext: Buffer; sharedSecret: Buffer };
  decapsulate: (ciphertext: Buffer, privateKey: KeyObject) => Buffer;
};

type PqcKeyType = KemAlgorithm | DsaAlgorithm | SlhDsaAlgorithm;

const NATIVE_KEM_ALGORITHMS: KemAlgorithm[] = ['ml-kem-512', 'ml-kem-768', 'ml-kem-1024'];
const NATIVE_DSA_ALGORITHMS: PqcKeyType[] = [
  'ml-dsa-44',
  'ml-dsa-65',
  'ml-dsa-87',
  'slh-dsa-sha2-128f',
  'slh-dsa-sha2-128s',
  'slh-dsa-sha2-192f',
  'slh-dsa-sha2-192s',
  'slh-dsa-sha2-256f',
  'slh-dsa-sha2-256s',
];

let nativeSupportCache: Set<string> | undefined;

function generatePqcKeyPair(algorithm: PqcKeyType): { publicKey: KeyObject; privateKey: KeyObject } {
  return generateKeyPairSync(algorithm as never);
}

export function resetNativeSupportCache(): void {
  nativeSupportCache = undefined;
}

export function supportsNativePqc(): boolean {
  if (nativeSupportCache) {
    return nativeSupportCache.size > 0;
  }

  nativeSupportCache = new Set<string>();
  for (const algorithm of NATIVE_KEM_ALGORITHMS) {
    try {
      generatePqcKeyPair(algorithm);
      nativeSupportCache.add(algorithm);
    } catch {
      // unsupported on this Node/OpenSSL build
    }
  }

  for (const algorithm of NATIVE_DSA_ALGORITHMS) {
    try {
      generatePqcKeyPair(algorithm);
      nativeSupportCache.add(algorithm);
    } catch {
      // unsupported on this Node/OpenSSL build
    }
  }

  return nativeSupportCache.size > 0;
}

export function supportsNativeAlgorithm(algorithm: string): boolean {
  if (!nativeSupportCache) {
    supportsNativePqc();
  }
  return nativeSupportCache?.has(algorithm) ?? false;
}

export function supportsNativeKem(algorithm: KemAlgorithm): boolean {
  return supportsNativeAlgorithm(algorithm);
}

export function supportsNativeHybrid(): boolean {
  return supportsNativeKem('ml-kem-768');
}

export function supportsNativeDsa(algorithm: DsaAlgorithm | SlhDsaAlgorithm): boolean {
  return supportsNativeAlgorithm(algorithm);
}

function kemCrypto(): NativeKemCrypto {
  const encapsulate = (nodeCrypto as { encapsulate?: NativeKemCrypto['encapsulate'] }).encapsulate;
  const decapsulate = (nodeCrypto as { decapsulate?: NativeKemCrypto['decapsulate'] }).decapsulate;
  if (!encapsulate || !decapsulate) {
    throw new Error('Native KEM encapsulation is unavailable on this Node.js build.');
  }

  return { encapsulate, decapsulate };
}

function exportRawKey(key: KeyObject, type: 'public' | 'private'): Uint8Array {
  const exportType = type === 'public' ? 'spki' : 'pkcs8';
  return new Uint8Array(key.export({ format: 'der', type: exportType }));
}

function importPublicKey(bytes: Uint8Array): KeyObject {
  return createPublicKey({
    key: Buffer.from(bytes),
    format: 'der',
    type: 'spki',
  });
}

function importPrivateKey(bytes: Uint8Array): KeyObject {
  return createPrivateKey({
    key: Buffer.from(bytes),
    format: 'der',
    type: 'pkcs8',
  });
}

export function nativeGenerateKemKeyPair(algorithm: KemAlgorithm): KeyMaterial {
  const keys = generatePqcKeyPair(algorithm);
  return {
    algorithm,
    publicKey: exportRawKey(keys.publicKey, 'public'),
    secretKey: exportRawKey(keys.privateKey, 'private'),
  };
}

export function nativeEncapsulate(algorithm: KemAlgorithm, publicKey: Uint8Array): EncapsulationResult {
  const { encapsulate } = kemCrypto();
  const key = importPublicKey(publicKey);
  const result = encapsulate(key);
  return {
    ciphertext: new Uint8Array(result.ciphertext),
    sharedSecret: new Uint8Array(result.sharedSecret),
  };
}

export function nativeDecapsulate(
  algorithm: KemAlgorithm,
  ciphertext: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  const { decapsulate } = kemCrypto();
  const key = importPrivateKey(secretKey);
  return new Uint8Array(decapsulate(Buffer.from(ciphertext), key));
}

export function nativeGenerateDsaKeyPair(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
): KeyMaterial {
  const keys = generatePqcKeyPair(algorithm);
  return {
    algorithm,
    publicKey: exportRawKey(keys.publicKey, 'public'),
    secretKey: exportRawKey(keys.privateKey, 'private'),
  };
}

export function nativeSign(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  message: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  const key = importPrivateKey(secretKey);
  return new Uint8Array(sign(null, Buffer.from(message), key));
}

export function nativeVerify(
  algorithm: DsaAlgorithm | SlhDsaAlgorithm,
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  const key = importPublicKey(publicKey);
  return verify(null, Buffer.from(message), key, Buffer.from(signature));
}

export function aesGcmEncrypt(
  sharedSecret: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): { iv: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array } {
  const key = deriveAesKey(sharedSecret);
  const iv = new Uint8Array(randomBytes(12));
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  if (aad) {
    cipher.setAAD(Buffer.from(aad));
  }
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
  return {
    iv,
    ciphertext: new Uint8Array(encrypted),
    tag: new Uint8Array(cipher.getAuthTag()),
  };
}

export function aesGcmDecrypt(
  sharedSecret: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array,
): Uint8Array {
  const key = deriveAesKey(sharedSecret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(tag));
  if (aad) {
    decipher.setAAD(Buffer.from(aad));
  }
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext)),
    decipher.final(),
  ]);
  return new Uint8Array(decrypted);
}

function deriveAesKey(sharedSecret: Uint8Array): Buffer {
  const key = Buffer.alloc(32);
  const source = Buffer.from(sharedSecret);
  source.copy(key, 0, 0, Math.min(source.length, key.length));
  return key;
}