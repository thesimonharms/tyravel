import { CacheManager } from '@pondoknusa/cache';
import { UpstashStore, type UpstashStoreConfig } from './upstash-store.js';

export { UpstashClient } from './upstash-client.js';
export { UpstashStore, type UpstashStoreConfig } from './upstash-store.js';

export function registerUpstashCacheDriver(): void {
  CacheManager.extend('upstash', (config) => new UpstashStore(config as unknown as UpstashStoreConfig));
}