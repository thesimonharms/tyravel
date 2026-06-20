import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('API token hashing', () => {
  it('uses sha256 for storage', () => {
    expect(hashToken('plain-token')).toBe(
      createHash('sha256').update('plain-token').digest('hex'),
    );
  });
});