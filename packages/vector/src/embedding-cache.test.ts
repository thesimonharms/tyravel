import { describe, expect, it } from 'vitest';
import { ArrayStore } from '@pondoknusa/cache';
import { createCachedEmbedFn } from './embedding-cache.js';

describe('createCachedEmbedFn', () => {
  it('deduplicates embed calls via cache', async () => {
    const cache = new ArrayStore();
    let calls = 0;
    const embed = createCachedEmbedFn(async (text) => {
      calls += 1;
      return [text.length, 0.5];
    }, cache, { ttlSeconds: 300 });

    const first = await embed('hello');
    const second = await embed('hello');

    expect(first).toEqual([5, 0.5]);
    expect(second).toEqual([5, 0.5]);
    expect(calls).toBe(1);
  });
});