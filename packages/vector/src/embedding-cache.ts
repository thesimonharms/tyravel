import { createHash } from 'node:crypto';
import type { CacheStore } from '@pondoknusa/cache';
import type { EmbedFn, Embedding } from './types.js';

export interface EmbeddingCacheOptions {
  prefix?: string;
  ttlSeconds?: number;
}

export function embeddingCacheKey(text: string, prefix = 'vector:embed'): string {
  const digest = createHash('sha256').update(text).digest('hex');
  return `${prefix}:${digest}`;
}

export function createCachedEmbedFn(
  embed: EmbedFn,
  cache: CacheStore,
  options: EmbeddingCacheOptions = {},
): EmbedFn {
  const prefix = options.prefix ?? 'vector:embed';
  const ttlSeconds = options.ttlSeconds ?? 86_400;

  return async (text: string): Promise<Embedding> => {
    const key = embeddingCacheKey(text, prefix);
    const cached = await cache.get<Embedding>(key);
    if (cached) {
      return cached;
    }

    const embedding = await embed(text);
    await cache.put(key, embedding, ttlSeconds);
    return embedding;
  };
}