import { CacheLock } from './cache-lock.js';
import { CacheManager } from './cache-manager.js';
import type { CacheStore } from './types.js';

export class CacheRepository implements CacheStore {
  constructor(
    private readonly manager: CacheManager,
    private readonly connection?: string,
  ) {}

  private store(): CacheStore {
    return this.manager.store(this.connection);
  }

  private key(key: string): string {
    return this.manager.prefixKey(key);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.store().get<T>(this.key(key));
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.store().put(this.key(key), value, ttlSeconds);
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    return this.store().add(this.key(key), value, ttlSeconds);
  }

  async forget(key: string): Promise<boolean> {
    return this.store().forget(this.key(key));
  }

  async has(key: string): Promise<boolean> {
    return this.store().has(this.key(key));
  }

  async flush(): Promise<void> {
    await this.store().flush();
  }

  async remember<T>(key: string, ttlSeconds: number, callback: () => T | Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) {
      return existing;
    }
    const value = await callback();
    await this.put(key, value, ttlSeconds);
    return value;
  }

  lock(name: string, seconds = 0): CacheLock {
    return new CacheLock(this.store(), this.key(`lock:${name}`), seconds);
  }
}