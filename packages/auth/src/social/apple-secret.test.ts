import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createAppleClientSecret } from './apple-secret.js';

describe('createAppleClientSecret', () => {
  it('returns a JWT-shaped client secret', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const secret = createAppleClientSecret({
      teamId: 'TEAM123',
      keyId: 'KEY123',
      clientId: 'com.example.app',
      privateKey: pem,
    });

    expect(secret.split('.')).toHaveLength(3);
  });
});