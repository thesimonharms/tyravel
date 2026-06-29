import { describe, expect, it } from 'vitest';
import { MemoryRedis, type RedisManager } from '@pondoknusa/redis';
import { CacheManager } from './cache-manager.js';
import { CacheRepository } from './cache-repository.js';
import type { CacheConfig } from './types.js';

function asRedisManager(client: MemoryRedis): RedisManager {
  return {
    connection: async () => client as never,
    prefixKey: (key: string) => key,
    close: async () => {},
  } as unknown as RedisManager;
}

describe('RedisStore', () => {
  it('stores and retrieves values through CacheRepository', async () => {
    const config: CacheConfig = {
      default: 'redis',
      prefix: 'pondoknusa',
      connections: {
        redis: { driver: 'redis', connection: 'default' },
      },
    };

    const manager = new CacheManager(config, asRedisManager(new MemoryRedis()));
    const cache = new CacheRepository(manager);

    await cache.put('stats', { total: 3 }, 60);
    expect(await cache.get<{ total: number }>('stats')).toEqual({ total: 3 });
    expect(await cache.has('stats')).toBe(true);
    expect(await cache.forget('stats')).toBe(true);
    expect(await cache.get('stats')).toBeNull();
  });

  it('supports remember()', async () => {
    const config: CacheConfig = {
      default: 'redis',
      prefix: 'pondoknusa',
      connections: {
        redis: { driver: 'redis' },
      },
    };

    const manager = new CacheManager(config, asRedisManager(new MemoryRedis()));
    const cache = new CacheRepository(manager);
    let calls = 0;

    const first = await cache.remember('key', 30, async () => {
      calls += 1;
      return 'value';
    });
    const second = await cache.remember('key', 30, async () => {
      calls += 1;
      return 'value';
    });

    expect(first).toBe('value');
    expect(second).toBe('value');
    expect(calls).toBe(1);
  });
});