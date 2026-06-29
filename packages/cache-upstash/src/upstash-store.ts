import type { CacheStore } from '@pondoknusa/cache';
import { UpstashClient } from './upstash-client.js';

export interface UpstashStoreConfig {
  driver: 'upstash';
  url: string;
  token: string;
}

export class UpstashStore implements CacheStore {
  private readonly client: UpstashClient;

  constructor(config: UpstashStoreConfig) {
    this.client = new UpstashClient({
      url: config.url,
      token: config.token,
    });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.command<string | null>(['GET', key]);
    return value === null ? null : JSON.parse(value) as T;
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.command(['SET', key, serialized, 'EX', String(ttlSeconds)]);
      return;
    }
    await this.client.command(['SET', key, serialized]);
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const serialized = JSON.stringify(value);
    const result = ttlSeconds && ttlSeconds > 0
      ? await this.client.command<string | null>(['SET', key, serialized, 'EX', String(ttlSeconds), 'NX'])
      : await this.client.command<string | null>(['SET', key, serialized, 'NX']);
    return result === 'OK';
  }

  async forget(key: string): Promise<boolean> {
    const removed = await this.client.command<number>(['DEL', key]);
    return removed > 0;
  }

  async has(key: string): Promise<boolean> {
    const count = await this.client.command<number>(['EXISTS', key]);
    return count > 0;
  }

  async flush(): Promise<void> {
    await this.client.command(['FLUSHDB']);
  }
}