import { scryptSync } from 'node:crypto';
import { aesGcmDecrypt, aesGcmEncrypt } from './native-backend.js';
import { concatBytes, fromBase64, toBase64, toUtf8Bytes } from './encoding.js';

const AT_REST_PREFIX = 'pqc1:';

export function deriveAtRestKey(source: string, length = 32): Uint8Array {
  return new Uint8Array(scryptSync(source, 'pondoknusa-at-rest', length));
}

export function encryptAtRest(plaintext: Uint8Array, key: Uint8Array): Uint8Array {
  const encrypted = aesGcmEncrypt(key, plaintext);
  const header = toUtf8Bytes(
    JSON.stringify({
      v: 1,
      iv: toBase64(encrypted.iv),
      tag: toBase64(encrypted.tag),
    }),
  );
  const headerLength = new Uint8Array(4);
  new DataView(headerLength.buffer).setUint32(0, header.length, false);
  return concatBytes(headerLength, header, encrypted.ciphertext);
}

export function decryptAtRest(payload: Uint8Array, key: Uint8Array): Uint8Array {
  if (payload.length < 4) {
    throw new Error('Invalid at-rest payload.');
  }

  const headerLength = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(
    0,
    false,
  );
  const headerStart = 4;
  const headerEnd = headerStart + headerLength;
  if (headerEnd > payload.length) {
    throw new Error('Invalid at-rest payload.');
  }

  const header = JSON.parse(
    new TextDecoder().decode(payload.slice(headerStart, headerEnd)),
  ) as { iv: string; tag: string };
  const ciphertext = payload.slice(headerEnd);
  return aesGcmDecrypt(key, fromBase64(header.iv), ciphertext, fromBase64(header.tag));
}

export class PayloadCipher {
  constructor(private readonly key: Uint8Array) {}

  encrypt(plaintext: string): string {
    return `${AT_REST_PREFIX}${toBase64(encryptAtRest(toUtf8Bytes(plaintext), this.key))}`;
  }

  decrypt(payload: string): string {
    if (!this.isEncrypted(payload)) {
      return payload;
    }

    const bytes = fromBase64(payload.slice(AT_REST_PREFIX.length));
    return new TextDecoder().decode(decryptAtRest(bytes, this.key));
  }

  isEncrypted(payload: string): boolean {
    return payload.startsWith(AT_REST_PREFIX);
  }
}

export function resolveSessionCipherKey(key?: string, fallback?: string): Uint8Array | null {
  if (key) {
    const decoded = fromBase64(key);
    if (decoded.length < 16) {
      throw new Error('SESSION_ENCRYPTION_KEY must decode to at least 16 bytes.');
    }
    return decoded;
  }

  if (fallback && fallback.length > 0) {
    return deriveAtRestKey(fallback);
  }

  return null;
}