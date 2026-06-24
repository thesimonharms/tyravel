import { describe, expect, it } from 'vitest';
import { parseExpiresIn } from './token-expiry.js';

describe('parseExpiresIn', () => {
  it('parses day-based durations', () => {
    const expiresAt = parseExpiresIn('90d');
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt!.getTime()).toBeGreaterThan(Date.now() + 89 * 24 * 60 * 60 * 1000);
  });

  it('parses hour and minute durations', () => {
    const oneHour = parseExpiresIn('1h');
    const thirtyMinutes = parseExpiresIn('30m');
    expect(oneHour!.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
    expect(thirtyMinutes!.getTime()).toBeGreaterThan(Date.now() + 29 * 60 * 1000);
  });

  it('treats numeric input as days', () => {
    const expiresAt = parseExpiresIn(7);
    expect(expiresAt!.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });
});