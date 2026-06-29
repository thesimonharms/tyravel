import { beforeAll, describe, expect, it } from 'vitest';
import { SqliteConnection } from '@pondoknusa/database';
import { DatabaseNotificationInbox } from './database-inbox.js';
import type { Notifiable } from './types.js';

class TestUser implements Notifiable {
  constructor(readonly key: number) {}
  getKey() {
    return this.key;
  }
}

describe('DatabaseNotificationInbox', () => {
  const connection = new SqliteConnection(':memory:');
  const inbox = new DatabaseNotificationInbox({ connection });

  beforeAll(async () => {
    await connection.exec(`
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        notifiable_type TEXT NOT NULL,
        notifiable_id TEXT NOT NULL,
        data TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await connection.query(
      `INSERT INTO notifications (id, type, notifiable_type, notifiable_id, data, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
      [
        'n1', 'Welcome', 'TestUser', '1', '{"title":"Hi"}', null, '2026-01-01T00:00:00.000Z',
        'n2', 'Reminder', 'TestUser', '1', '{"title":"Ping"}', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z',
      ],
    );
  });

  it('paginates and tracks unread notifications', async () => {
    const user = new TestUser(1);
    const page = await inbox.paginate(user, 1, 10);
    expect(page.data).toHaveLength(2);
    expect(await inbox.unreadCount(user)).toBe(1);

    await inbox.markAsRead('n1');
    expect(await inbox.unreadCount(user)).toBe(0);

    await inbox.markAsUnread('n1');
    expect(await inbox.unreadCount(user)).toBe(1);
  });
});