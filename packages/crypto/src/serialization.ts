import { fromBase64, toBase64 } from './encoding.js';
import type { KeyMaterial, SerializedKeyMaterial } from './types.js';

export function serializeKeyMaterial(keys: KeyMaterial): SerializedKeyMaterial {
  return {
    algorithm: keys.algorithm,
    publicKey: toBase64(keys.publicKey),
    secretKey: toBase64(keys.secretKey),
  };
}

export function deserializeKeyMaterial(serialized: SerializedKeyMaterial): KeyMaterial {
  return {
    algorithm: serialized.algorithm,
    publicKey: fromBase64(serialized.publicKey),
    secretKey: fromBase64(serialized.secretKey),
  };
}