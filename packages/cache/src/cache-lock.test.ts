import { describe, expect, it } from 'vitest';
import { MemoryRedis } from '@tyravel/redis';
import { CacheManager, CacheRepository } from './index.js';
import { LockAcquisitionError } from './cache-lock.js';
import { RedisStore } from './redis-store.js';

describe('CacheLock', () => {
  it('acquires and releases array-store locks exclusively', async () => {
    const manager = new CacheManager({
      default: 'array',
      connections: { array: { driver: 'array' } },
    });
    const cache = new CacheRepository(manager);
    const lock = cache.lock('invoice', 60);

    expect(await lock.acquire()).toBe(true);
    expect(await lock.acquire()).toBe(false);
    expect(await lock.release()).toBe(true);
    expect(await lock.acquire()).toBe(true);
    await lock.release();
  });

  it('runs callbacks inside get()', async () => {
    const manager = new CacheManager({
      default: 'array',
      connections: { array: { driver: 'array' } },
    });
    const cache = new CacheRepository(manager);
    let value = 0;

    await cache.lock('counter').get(async () => {
      value += 1;
    });

    expect(value).toBe(1);
  });

  it('throws when get() cannot acquire the lock', async () => {
    const manager = new CacheManager({
      default: 'array',
      connections: { array: { driver: 'array' } },
    });
    const cache = new CacheRepository(manager);
    const lock = cache.lock('busy');
    await lock.acquire();

    await expect(cache.lock('busy').get(() => 'nope')).rejects.toBeInstanceOf(LockAcquisitionError);
    await lock.release();
  });

  it('supports atomic add on redis stores', async () => {
    const client = new MemoryRedis();
    const redis = {
      connection: async () => client as never,
      prefixKey: (key: string) => key,
      close: async () => {},
    } as never;
    const store = new RedisStore(redis, 'default');

    expect(await store.add('lock:shared', 'owner-a', 30)).toBe(true);
    expect(await store.add('lock:shared', 'owner-b', 30)).toBe(false);
  });
});