import { describe, expect, it } from 'vitest';
import { WebSocketConnector, type WebSocketLike } from './websocket.js';

describe('WebSocketConnector', () => {
  it('subscribes to channels and receives events', async () => {
    const sent: string[] = [];
    const messageHandlers = new Set<(event: { data: string }) => void>();

    const socket: WebSocketLike = {
      readyState: 1,
      send(data) {
        sent.push(data);
      },
      close() {},
      addEventListener(type, listener) {
        if (type === 'message') {
          messageHandlers.add(listener as (event: { data: string }) => void);
        }
      },
      removeEventListener(type, listener) {
        if (type === 'message') {
          messageHandlers.delete(listener as (event: { data: string }) => void);
        }
      },
    };

    const connector = new WebSocketConnector({
      host: 'http://127.0.0.1:3000',
      path: '/pondoknusa/ws',
      webSocket: () => socket,
      authTransport: {
        authorize: async () => ({ auth: 'signed' }),
      },
    });

    await connector.connect();
    for (const handler of messageHandlers) {
      handler({ data: JSON.stringify({ type: 'connected', socketId: 'socket-42' }) });
    }

    await connector.subscribe('private-orders.1');
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!)).toEqual({
      type: 'subscribe',
      channel: 'private-orders.1',
      auth: 'signed',
    });

    const payloads: unknown[] = [];
    connector.listen('private-orders.1', 'OrderShipped', (payload) => payloads.push(payload));
    for (const handler of messageHandlers) {
      handler({
        data: JSON.stringify({
          type: 'event',
          channel: 'private-orders.1',
          event: 'OrderShipped',
          data: { id: 3 },
        }),
      });
    }

    expect(payloads).toEqual([{ id: 3 }]);
  });
});