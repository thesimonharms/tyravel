import { CacheManager } from '@pondoknusa/cache';
import { MemcachedStore, type MemcachedStoreConfig } from './memcached-store.js';

export { MemcachedClient } from './memcached-client.js';
export { MemcachedStore, type MemcachedStoreConfig } from './memcached-store.js';

export function registerMemcachedCacheDriver(): void {
  CacheManager.extend('memcached', (config) => new MemcachedStore(config as unknown as MemcachedStoreConfig));
}