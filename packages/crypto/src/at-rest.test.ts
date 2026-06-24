import { describe, expect, it } from 'vitest';
import { PayloadCipher, deriveAtRestKey, encryptAtRest, decryptAtRest } from './at-rest.js';
import { toUtf8Bytes } from './encoding.js';

describe('at-rest encryption', () => {
  it('round-trips symmetric payloads', () => {
    const key = deriveAtRestKey('app-secret');
    const plaintext = toUtf8Bytes('{"user":1}');
    const encrypted = encryptAtRest(plaintext, key);
    const decrypted = decryptAtRest(encrypted, key);
    expect(decrypted).toEqual(plaintext);
  });

  it('encrypts session payload strings with a prefix marker', () => {
    const cipher = new PayloadCipher(deriveAtRestKey('session-key'));
    const encrypted = cipher.encrypt('{"theme":"dark"}');
    expect(cipher.isEncrypted(encrypted)).toBe(true);
    expect(cipher.decrypt(encrypted)).toBe('{"theme":"dark"}');
  });
});