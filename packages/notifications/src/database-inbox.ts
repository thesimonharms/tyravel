import type { DatabaseConnection } from '@pondoknusa/database';
import { QueryBuilder } from '@pondoknusa/database';
import { LengthAwarePaginator, type PaginatedResponse } from '@pondoknusa/database';
import type { Notifiable } from './types.js';

export interface DatabaseNotificationRecord {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
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

export interface DatabaseInboxOptions {
  connection: DatabaseConnection;
  table?: string;
}

export class DatabaseNotificationInbox {
  constructor(private readonly options: DatabaseInboxOptions) {}

  private table(): string {
    return this.options.table ?? 'notifications';
  }

  private query(): QueryBuilder<NotificationRow> {
    return new QueryBuilder<NotificationRow>(this.options.connection, this.table());
  }

  async paginate(
    notifiable: Notifiable,
    page = 1,
    perPage = 15,
  ): Promise<PaginatedResponse<DatabaseNotificationRecord>> {
    const builder = this.query()
      .where('notifiable_type', notifiable.constructor.name)
      .where('notifiable_id', String(notifiable.getKey()))
      .orderBy('created_at', 'desc');

    const total = await builder.count();
    const rows = await builder
      .limit(perPage)
      .offset((page - 1) * perPage)
      .get();

    const paginator = new LengthAwarePaginator(rows, total, perPage, page);
    return {
      ...paginator.meta(),
      data: rows.map(mapRow),
    };
  }

  async unread(notifiable: Notifiable, page = 1, perPage = 15) {
    const builder = this.query()
      .where('notifiable_type', notifiable.constructor.name)
      .where('notifiable_id', String(notifiable.getKey()))
      .whereNull('read_at')
      .orderBy('created_at', 'desc');

    const total = await builder.count();
    const rows = await builder.limit(perPage).offset((page - 1) * perPage).get();
    const paginator = new LengthAwarePaginator(rows, total, perPage, page);

    return {
      ...paginator.meta(),
      data: rows.map(mapRow),
    };
  }

  async unreadCount(notifiable: Notifiable): Promise<number> {
    return this.query()
      .where('notifiable_type', notifiable.constructor.name)
      .where('notifiable_id', String(notifiable.getKey()))
      .whereNull('read_at')
      .count();
  }

  async markAsRead(id: string): Promise<boolean> {
    const updated = await this.query()
      .where('id', id)
      .update({ read_at: new Date().toISOString() });
    return updated > 0;
  }

  async markAsUnread(id: string): Promise<boolean> {
    const updated = await this.query()
      .where('id', id)
      .update({ read_at: null });
    return updated > 0;
  }

  async markAllAsRead(notifiable: Notifiable): Promise<number> {
    return this.query()
      .where('notifiable_type', notifiable.constructor.name)
      .where('notifiable_id', String(notifiable.getKey()))
      .whereNull('read_at')
      .update({ read_at: new Date().toISOString() });
  }
}

function mapRow(row: NotificationRow): DatabaseNotificationRecord {
  return {
    id: row.id,
    type: row.type,
    notifiable_type: row.notifiable_type,
    notifiable_id: row.notifiable_id,
    data: JSON.parse(row.data) as Record<string, unknown>,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}