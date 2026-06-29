import { describe, expect, it } from 'vitest';
import { MemoryRedis, type RedisManager } from '@pondoknusa/redis';
import { SessionManager } from './session-manager.js';
import { MemorySessionStore } from './session-store.js';
import { RedisSessionStore } from './redis-session-store.js';

function asRedisManager(client: MemoryRedis): RedisManager {
  return {
    connection: async () => client as never,
    prefixKey: (key: string) => key,
    close: async () => {},
  } as unknown as RedisManager;
}

describe('SessionManager', () => {
  it('uses the array driver', () => {
    const manager = new SessionManager({
      driver: 'array',
      cookie: 'pondoknusa_session',
      lifetimeMinutes: 120,
    });

    expect(manager.driver()).toBeInstanceOf(MemorySessionStore);
  });

  it('uses the redis driver when a redis manager is available', async () => {
    const manager = new SessionManager(
      {
        driver: 'redis',
        cookie: 'pondoknusa_session',
        lifetimeMinutes: 120,
        prefix: 'app:session',
      },
      undefined,
      asRedisManager(new MemoryRedis()),
    );

    const store = manager.driver();
    expect(store).toBeInstanceOf(RedisSessionStore);

    await store.write('session-1', { theme: 'dark' }, 30);
    expect(await store.read('session-1')).toEqual({ theme: 'dark' });
    await store.destroy('session-1');
    expect(await store.read('session-1')).toEqual({});
  });

  it('throws when redis driver is configured without redis manager', () => {
    const manager = new SessionManager({
      driver: 'redis',
      cookie: 'pondoknusa_session',
      lifetimeMinutes: 120,
    });

    expect(() => manager.driver()).toThrow(
      'Redis manager is required for the redis session driver',
    );
  });
});