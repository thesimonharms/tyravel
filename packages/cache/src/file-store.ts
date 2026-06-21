import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import type { CacheStore } from './types.js';

interface FilePayload {
  value: unknown;
  expiresAt: number | null;
}

export class FileStore implements CacheStore {
  constructor(private readonly directory: string) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const path = this.pathFor(key);
    try {
      const raw = await readFile(path, 'utf8');
      const payload = JSON.parse(raw) as FilePayload;
      if (payload.expiresAt !== null && payload.expiresAt <= Date.now()) {
        await rm(path, { force: true });
        return null;
      }
      return payload.value as T;
    } catch {
      return null;
    }
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const expiresAt =
      ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    const payload: FilePayload = { value, expiresAt };
    await writeFile(path, JSON.stringify(payload), 'utf8');
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (await this.has(key)) {
      return false;
    }
    await this.put(key, value, ttlSeconds);
    return true;
  }

  async forget(key: string): Promise<boolean> {
    const path = this.pathFor(key);
    try {
      await rm(path, { force: true });
      return true;
    } catch {
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async flush(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(this.directory);
    await Promise.all(
      entries.map((name) => rm(join(this.directory, name), { force: true })),
    );
  }

  private pathFor(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex');
    return join(this.directory, hash.slice(0, 2), hash);
  }
}