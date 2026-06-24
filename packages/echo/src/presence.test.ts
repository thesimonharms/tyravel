import { describe, expect, it } from 'vitest';
import { Echo } from './echo.js';
import { MockConnector } from './connectors/mock.js';

describe('presence channel callbacks', () => {
  it('fires here, joining, leaving, and error callbacks', async () => {
    const connector = new MockConnector();
    await connector.connect();

    const echo = new Echo({ broadcaster: 'null', connector });
    const hereMembers: unknown[] = [];
    const joined: unknown[] = [];
    const left: unknown[] = [];
    const errors: unknown[] = [];

    echo
      .join('chat', { id: 1, name: 'Ada' })
      .here((members) => hereMembers.push(...members))
      .joining((member) => joined.push(member))
      .leaving((member) => left.push(member))
      .error((error) => errors.push(error));

    await echo.join('chat').subscribe();

    connector.emit('presence-chat', 'pusher:subscription_succeeded', {
      members: {
        '1': { id: 1, name: 'Ada' },
        '2': { id: 2, name: 'Grace' },
      },
    });
    connector.emit('presence-chat', 'pusher:member_added', {
      info: { id: 3, name: 'Alan' },
    });
    connector.emit('presence-chat', 'pusher:member_removed', {
      info: { id: 2, name: 'Grace' },
    });
    connector.emit('presence-chat', 'pusher:subscription_error', { status: 403 });

    expect(hereMembers).toEqual([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);
    expect(joined).toEqual([{ id: 3, name: 'Alan' }]);
    expect(left).toEqual([{ id: 2, name: 'Grace' }]);
    expect(errors).toEqual([{ status: 403 }]);
  });
});