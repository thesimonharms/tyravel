import { createHash } from 'node:crypto';
import type { CacheStore } from '@pondoknusa/cache';
import type { GraphQLExecutionResult, GraphQLRequestPayload } from './types.js';

export function buildGraphQLCacheKey(payload: GraphQLRequestPayload): string {
  const digest = createHash('sha256')
    .update(JSON.stringify({
      query: payload.query ?? '',
      operationName: payload.operationName ?? '',
      variables: payload.variables ?? {},
    }))
    .digest('hex');

  return `graphql:response:${digest}`;
}

export async function rememberGraphQLResponse(
  cache: CacheStore,
  key: string,
  ttlSeconds: number,
  callback: () => Promise<GraphQLExecutionResult>,
): Promise<GraphQLExecutionResult> {
  const cached = await cache.get<GraphQLExecutionResult>(key);
  if (cached) {
    return cached;
  }

  const result = await callback();
  if (!result.errors?.length) {
    await cache.put(key, result, ttlSeconds);
  }

  return result;
}