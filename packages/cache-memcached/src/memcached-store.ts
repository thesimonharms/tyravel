import type { CacheStore } from '@pondoknusa/cache';
import { MemcachedClient } from './memcached-client.js';

export interface MemcachedStoreConfig {
  driver: 'memcached';
  host: string;
  port?: number;
}

export class MemcachedStore implements CacheStore {
  private readonly client: MemcachedClient;

  constructor(config: MemcachedStoreConfig) {
    this.client = new MemcachedClient({
      host: config.host,
      port: config.port,
    });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value === null ? null : JSON.parse(value) as T;
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), ttlSeconds ?? 0);
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    return this.client.add(key, JSON.stringify(value), ttlSeconds ?? 0);
  }

  async forget(key: string): Promise<boolean> {
    return this.client.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async flush(): Promise<void> {
    await this.client.flushAll();
  }
}