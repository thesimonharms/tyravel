import { describe, expect, it, vi } from 'vitest';
import { ArrayStore } from '@pondoknusa/cache';
import { buildGraphQLCacheKey, rememberGraphQLResponse } from './cache.js';

describe('GraphQL cache helpers', () => {
  it('builds stable cache keys for equivalent payloads', () => {
    const left = buildGraphQLCacheKey({
      query: '{ hello }',
      variables: { id: 1 },
    });
    const right = buildGraphQLCacheKey({
      query: '{ hello }',
      variables: { id: 1 },
    });

    expect(left).toBe(right);
    expect(left.startsWith('graphql:response:')).toBe(true);
  });

  it('caches successful responses and skips error responses', async () => {
    const cache = new ArrayStore();
    const callback = vi
      .fn()
      .mockResolvedValueOnce({ data: { hello: 'world' } })
      .mockResolvedValueOnce({ data: null, errors: [{ message: 'boom' }] });

    const first = await rememberGraphQLResponse(cache, 'graphql:test', 60, callback);
    const second = await rememberGraphQLResponse(cache, 'graphql:test', 60, callback);

    expect(first).toEqual({ data: { hello: 'world' } });
    expect(second).toEqual({ data: { hello: 'world' } });
    expect(callback).toHaveBeenCalledTimes(1);

    const errorResult = await rememberGraphQLResponse(cache, 'graphql:error', 60, callback);
    expect(errorResult).toEqual({ data: null, errors: [{ message: 'boom' }] });
    expect(await cache.get('graphql:error')).toBeNull();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});