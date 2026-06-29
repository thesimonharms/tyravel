import type { CacheRepository, TaggedCache } from '@pondoknusa/cache';
import type { Application } from './application.js';

let cacheApplication: Application | undefined;

export function setCacheApplication(app: Application): void {
  cacheApplication = app;
}

function resolveCache(): CacheRepository {
  if (!cacheApplication) {
    throw new Error('Cache facade is not ready. Boot the application first.');
  }
  return cacheApplication.make<CacheRepository>('cache');
}

export interface CacheFacade {
  get<T = unknown>(key: string): Promise<T | null>;
  put(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  forget(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  remember<T>(key: string, ttlSeconds: number, callback: () => T | Promise<T>): Promise<T>;
  flush(): Promise<void>;
  tags(names: string[]): TaggedCache;
}

export const Cache: CacheFacade = {
  get: (key) => resolveCache().get(key),
  put: (key, value, ttl) => resolveCache().put(key, value, ttl),
  forget: (key) => resolveCache().forget(key),
  has: (key) => resolveCache().has(key),
  remember: (key, ttl, callback) => resolveCache().remember(key, ttl, callback),
  flush: () => resolveCache().flush(),
  tags: (names) => resolveCache().tags(names),
};