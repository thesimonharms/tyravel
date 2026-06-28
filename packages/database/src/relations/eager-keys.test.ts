import { describe, expect, it } from 'vitest';
import { dedupeEagerKeys } from './eager-keys.js';

describe('dedupeEagerKeys', () => {
  it('removes duplicate keys and nullish values', () => {
    expect(dedupeEagerKeys([1, 2, 2, null, undefined, 1, 3])).toEqual([1, 2, 3]);
  });

  it('returns single-element arrays unchanged', () => {
    expect(dedupeEagerKeys([42])).toEqual([42]);
  });
});