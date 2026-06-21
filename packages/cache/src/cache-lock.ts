import { randomUUID } from 'node:crypto';
import type { CacheStore } from './types.js';

export class LockTimeoutError extends Error {
  constructor(message = 'Could not acquire cache lock within the allotted time') {
    super(message);
    this.name = 'LockTimeoutError';
  }
}

export class LockAcquisitionError extends Error {
  constructor(message = 'Could not acquire cache lock') {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}

export class CacheLock {
  private readonly owner = randomUUID();

  constructor(
    private readonly store: CacheStore,
    private readonly key: string,
    private readonly seconds: number,
  ) {}

  async acquire(): Promise<boolean> {
    const ttl = this.seconds > 0 ? this.seconds : undefined;
    return this.store.add(this.key, this.owner, ttl);
  }

  async release(): Promise<boolean> {
    const current = await this.store.get<string>(this.key);
    if (current !== this.owner) {
      return false;
    }
    return this.store.forget(this.key);
  }

  async get<T>(callback: () => T | Promise<T>): Promise<T> {
    if (!(await this.acquire())) {
      throw new LockAcquisitionError();
    }

    try {
      return await callback();
    } finally {
      await this.release();
    }
  }

  async block(seconds: number, callback: () => void | Promise<void>): Promise<void> {
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      if (await this.acquire()) {
        try {
          await callback();
        } finally {
          await this.release();
        }
        return;
      }

      await sleep(100);
    }

    throw new LockTimeoutError();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}