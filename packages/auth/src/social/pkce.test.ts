import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createPkcePair } from './pkce.js';

describe('createPkcePair', () => {
  it('creates a verifier and matching S256 challenge', () => {
    const pair = createPkcePair();
    const expected = createHash('sha256').update(pair.verifier).digest('base64url');

    expect(pair.method).toBe('S256');
    expect(pair.challenge).toBe(expected);
  });
});