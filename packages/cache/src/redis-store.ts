import type { RedisManager } from '@tyravel/redis';
import type { CacheStore } from './types.js';

export class RedisStore implements CacheStore {
  constructor(
    private readonly redis: RedisManager,
    private readonly connectionName: string,
    private readonly storePrefix = '',
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const client = await this.redis.connection(this.connectionName);
    const value = await client.get(this.prefixed(key));
    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = await this.redis.connection(this.connectionName);
    const serialized = JSON.stringify(value);

    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(this.prefixed(key), serialized, { EX: ttlSeconds });
      return;
    }

    await client.set(this.prefixed(key), serialized);
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = await this.redis.connection(this.connectionName);
    const serialized = JSON.stringify(value);
    const options: { EX?: number; NX?: boolean } = { NX: true };
    if (ttlSeconds && ttlSeconds > 0) {
      options.EX = ttlSeconds;
    }
    const result = await client.set(this.prefixed(key), serialized, options);
    return result === 'OK';
  }

  async forget(key: string): Promise<boolean> {
    const client = await this.redis.connection(this.connectionName);
    const removed = await client.del(this.prefixed(key));
    return removed > 0;
  }

  async has(key: string): Promise<boolean> {
    const client = await this.redis.connection(this.connectionName);
    const count = await client.exists(this.prefixed(key));
    return count > 0;
  }

  async flush(): Promise<void> {
    const client = await this.redis.connection(this.connectionName);
    const pattern = this.storePrefix ? `${this.storePrefix}:*` : '*';
    const keys: string[] = [];

    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
      if (keys.length >= 100) {
        await client.del(...keys);
        keys.length = 0;
      }
    }

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  private prefixed(key: string): string {
    return this.storePrefix ? `${this.storePrefix}:${key}` : key;
  }
}