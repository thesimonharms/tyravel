import { randomUUID } from 'node:crypto';
import type { DatabaseConnection } from '@pondoknusa/database';
import { QueryBuilder } from '@pondoknusa/database';
import type { Notification } from '../notification.js';
import type { Notifiable } from '../types.js';

export interface DatabaseChannelOptions {
  connection: DatabaseConnection;
  table?: string;
}

interface NotificationRow {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: string;
  data: string;
  read_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

export class DatabaseChannel {
  constructor(private readonly options: DatabaseChannelOptions) {}

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toDatabase) {
      throw new Error(`Notification ${notification.id()} does not implement toDatabase().`);
    }
    const data = await notification.toDatabase(notifiable);
    const table = this.options.table ?? 'notifications';
    const now = new Date().toISOString();
    await new QueryBuilder<NotificationRow>(this.options.connection, table).insert({
      id: randomUUID(),
      type: notification.id(),
      notifiable_type: notifiable.constructor.name,
      notifiable_id: String(notifiable.getKey()),
      data: JSON.stringify(data),
      read_at: null,
      created_at: now,
    });
  }
}