import type { CacheStore } from './types.js';

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

export class ArrayStore implements CacheStore {
  private readonly data = new Map<string, Entry>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.data.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.data.set(key, { value, expiresAt });
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (await this.has(key)) {
      return false;
    }
    await this.put(key, value, ttlSeconds);
    return true;
  }

  async forget(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async flush(): Promise<void> {
    this.data.clear();
  }
}