import { describe, expect, it } from 'vitest';
import { MlDsa } from './ml-dsa.js';
import { SignedTokenService } from './signed-token.js';

describe('SignedTokenService', () => {
  it('signs and verifies opaque OAuth-style tokens', () => {
    const keys = new MlDsa('ml-dsa-65').generateKeyPair();
    const signer = new SignedTokenService({
      algorithm: 'ml-dsa-65',
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
    });

    const token = signer.sign(
      {
        v: 1,
        id: 42,
        exp: Math.floor(Date.now() / 1000) + 3600,
        c: 'client-1',
        u: 7,
        s: ['read'],
      },
      'oat_',
    );

    expect(token.startsWith('oat_')).toBe(true);
    expect(signer.isSignedToken(token, 'oat_')).toBe(true);
    const payload = signer.verify(token, 'oat_');
    expect(payload?.id).toBe(42);
    expect(payload?.c).toBe('client-1');
  });
});