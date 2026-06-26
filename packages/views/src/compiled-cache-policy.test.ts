import { describe, expect, it } from 'vitest';
import { shouldRequireCompiledCache } from './compiled-cache-policy.js';

describe('compiled cache policy', () => {
  it('requires warm cache only in production trust mode', () => {
    expect(
      shouldRequireCompiledCache({ requireCompiledCache: true }, true),
    ).toBe(true);
    expect(
      shouldRequireCompiledCache({ requireCompiledCache: true }, false),
    ).toBe(false);
    expect(
      shouldRequireCompiledCache({ requireCompiledCache: false }, true),
    ).toBe(false);
  });
});