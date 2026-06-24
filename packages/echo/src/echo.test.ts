import { describe, expect, it } from 'vitest';
import { Echo } from './echo.js';
import { MockConnector } from './connectors/mock.js';
import { formatChannelName, normalizeListenEvent } from './event-name.js';

describe('event names', () => {
  it('strips broadcastAs dot prefixes', () => {
    expect(normalizeListenEvent('.OrderShipped')).toBe('OrderShipped');
    expect(normalizeListenEvent('OrderShipped')).toBe('OrderShipped');
  });

  it('formats private and presence channel names', () => {
    expect(formatChannelName('orders.1', 'private')).toBe('private-orders.1');
    expect(formatChannelName('chat', 'presence')).toBe('presence-chat');
  });
});

describe('Echo', () => {
  it('listens on public channels via the connector', async () => {
    const connector = new MockConnector();
    await connector.connect();

    const echo = new Echo({ broadcaster: 'null', connector });
    const payloads: unknown[] = [];

    echo.channel('orders.1').listen('.OrderShipped', (payload) => {
      payloads.push(payload);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    connector.emit('orders.1', 'OrderShipped', { id: 42 });

    expect(payloads).toEqual([{ id: 42 }]);
  });

  it('creates private channels with the private- prefix', () => {
    const connector = new MockConnector();
    const echo = new Echo({ broadcaster: 'null', connector });
    expect(echo.private('orders.1').name).toBe('private-orders.1');
  });

  it('creates presence channels with serialized channel data', () => {
    const connector = new MockConnector();
    const echo = new Echo({ broadcaster: 'null', connector });
    const channel = echo.join('chat', { id: 7, name: 'Ada' });
    expect(channel.name).toBe('presence-chat');
  });
});