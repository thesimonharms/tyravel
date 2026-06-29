import { describe, expect, it } from 'vitest';
import { MemoryRedis, type RedisManager } from '@pondoknusa/redis';
import { PONDOKNUSA_BROADCAST_REDIS_CHANNEL } from '@pondoknusa/broadcasting';
import { WebSocketBroadcaster } from './websocket-broadcaster.js';

function asRedisManager(client: MemoryRedis): RedisManager {
  return {
    connection: async () => client as never,
    prefixKey: (key: string) => key,
    close: async () => {},
  } as unknown as RedisManager;
}

describe('WebSocketBroadcaster', () => {
  it('publishes broadcast payloads to redis', async () => {
    const redis = new MemoryRedis();
    const broadcaster = new WebSocketBroadcaster(asRedisManager(redis), {
      driver: 'websocket',
    });

    await broadcaster.broadcast({
      event: 'OrderShipped',
      channels: ['orders.1'],
      data: { id: 1 },
    });

    expect(redis.published).toHaveLength(1);
    expect(redis.published[0]?.channel).toBe(PONDOKNUSA_BROADCAST_REDIS_CHANNEL);
    expect(redis.published[0]?.message).toContain('OrderShipped');
  });

  it('signs private channel auth tokens', () => {
    const broadcaster = new WebSocketBroadcaster(asRedisManager(new MemoryRedis()), {
      driver: 'websocket',
    });

    expect(broadcaster.signChannel('socket-1', 'private-orders.1')).toBe(
      'socket-1:private-orders.1',
    );
  });
});