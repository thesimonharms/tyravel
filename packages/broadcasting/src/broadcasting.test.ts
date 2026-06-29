import { describe, expect, it, vi } from 'vitest';
import { Event } from '@pondoknusa/events';
import { BroadcastDispatcher } from './broadcast-dispatcher.js';
import { BroadcastManager } from './broadcast-manager.js';
import { ChannelRegistry } from './channel-registry.js';
import { LogBroadcaster } from './log-broadcaster.js';
import type { ShouldBroadcast } from './types.js';

class OrderShipped extends Event<{ orderId: number }> implements ShouldBroadcast {
  readonly shouldBroadcast = true as const;

  broadcastOn(): string {
    return `orders.${this.data.orderId}`;
  }

  broadcastAs(): string {
    return 'OrderShipped';
  }
}

describe('BroadcastManager', () => {
  it('resolves built-in log driver', async () => {
    const manager = new BroadcastManager({
      default: 'log',
      connections: { log: { driver: 'log' } },
    });
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await manager.connection().broadcast({
      event: 'TestEvent',
      channels: ['orders.1'],
      data: { ok: true },
    });

    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });
});

describe('BroadcastDispatcher', () => {
  it('broadcasts ShouldBroadcast events', async () => {
    const broadcaster = new LogBroadcaster();
    const sent: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      sent.push(String(chunk));
      return true;
    });

    const manager = {
      getDefaultConnection: () => 'log',
      connection: () => broadcaster,
    } as unknown as BroadcastManager;

    const dispatcher = new BroadcastDispatcher({ manager });
    await dispatcher.dispatch(new OrderShipped({ orderId: 42 }));

    expect(sent.join('')).toContain('OrderShipped');
    expect(sent.join('')).toContain('orders.42');
  });
});

describe('ChannelRegistry', () => {
  it('authorizes static and dynamic channels', async () => {
    const registry = new ChannelRegistry();
    registry.register('public', () => true);
    registry.register('private-user.{id}', (user, id) => user === `user:${id}`);
    registry.register('private-App.Models.User.{id}', (user, id) => user === `user:${id}`);
    registry.register('presence-App.Room.{roomId}', (user, roomId) =>
      Boolean(user) && roomId === 'lobby',
    );

    expect(await registry.authorize('public', null)).toBe(true);
    expect(await registry.authorize('private-user.7', 'user:7')).toBe(true);
    expect(await registry.authorize('private-user.7', 'user:9')).toBe(false);
    expect(await registry.authorize('private-App.Models.User.7', 'user:7')).toBe(true);
    expect(await registry.authorize('presence-App.Room.lobby', 'user:1')).toBe(true);
    expect(await registry.authorize('presence-App.Room.other', 'user:1')).toBe(false);
  });
});