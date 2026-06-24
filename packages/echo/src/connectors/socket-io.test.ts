import { describe, expect, it } from 'vitest';
import { SocketIoConnector, type SocketIoLike } from './socket-io.js';

describe('SocketIoConnector', () => {
  it('authorizes private channels before subscribing', async () => {
    const emitted: unknown[] = [];
    const socket: SocketIoLike = {
      id: 'socket-99',
      on() {},
      off() {},
      emit(event, payload) {
        emitted.push({ event, payload });
      },
      disconnect() {},
    };

    const connector = new SocketIoConnector({
      io: () => socket,
      authTransport: {
        authorize: async () => ({ auth: 'signed-auth' }),
      },
    });

    await connector.subscribe('private-chat.1');
    expect(emitted).toEqual([
      {
        event: 'subscribe',
        payload: { channel: 'private-chat.1', auth: 'signed-auth' },
      },
    ]);
  });

  it('routes socket events to channel listeners', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket: SocketIoLike = {
      id: 'socket-1',
      on(event, handler) {
        handlers.set(event, handler);
      },
      off(event) {
        handlers.delete(event);
      },
      emit() {},
      disconnect() {},
    };

    const connector = new SocketIoConnector({ io: () => socket });
    await connector.connect();
    await connector.subscribe('orders.1');

    const payloads: unknown[] = [];
    connector.listen('orders.1', 'OrderShipped', (payload) => payloads.push(payload));
    handlers.get('OrderShipped')?.({ id: 7 });

    expect(payloads).toEqual([{ id: 7 }]);
  });

  it('routes laravel-style channel tuples and presence callbacks', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const socket: SocketIoLike = {
      id: 'socket-1',
      on(event, handler) {
        handlers.set(event, handler);
      },
      off(event) {
        handlers.delete(event);
      },
      emit() {},
      disconnect() {},
    };

    const connector = new SocketIoConnector({
      io: () => socket,
      authTransport: {
        authorize: async () => ({ auth: 'signed-auth' }),
      },
    });
    await connector.connect();
    await connector.subscribe('presence-chat');

    const hereMembers: unknown[] = [];
    const joined: unknown[] = [];
    connector.bindPresenceEvents('presence-chat', {
      here: (members) => hereMembers.push(...members),
      joining: (member) => joined.push(member),
    });

    handlers.get('presence:subscribed')?.('presence-chat', [
      { user_info: { id: 1, name: 'Ada' } },
    ]);
    handlers.get('presence:joining')?.('presence-chat', {
      user_info: { id: 2, name: 'Grace' },
    });

    expect(hereMembers).toEqual([{ id: 1, name: 'Ada' }]);
    expect(joined).toEqual([{ id: 2, name: 'Grace' }]);
  });
});