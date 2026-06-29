import type { PayloadCipher } from '@pondoknusa/crypto';
import type { DatabaseConnection } from '@pondoknusa/database';
import { QueryBuilder } from '@pondoknusa/database';
import type { SessionStore } from './session.js';

interface SessionsTableRow {
  id: string;
  payload: string;
  last_activity: number;
  [key: string]: unknown;
}

export class DatabaseSessionStore implements SessionStore {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table = 'sessions',
    private readonly cipher?: PayloadCipher,
  ) {}

  async read(id: string): Promise<Record<string, unknown>> {
    const row = await new QueryBuilder<SessionsTableRow>(this.connection, this.table)
      .where('id', id)
      .first();

    if (!row) {
      return {};
    }

    try {
      const decoded = this.cipher ? this.cipher.decrypt(row.payload) : row.payload;
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async write(
    id: string,
    data: Record<string, unknown>,
    lifetimeMinutes: number,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const serialized = JSON.stringify(data);
    const payload = this.cipher ? this.cipher.encrypt(serialized) : serialized;
    const existing = await new QueryBuilder<SessionsTableRow>(this.connection, this.table)
      .where('id', id)
      .first();

    if (existing) {
      await new QueryBuilder(this.connection, this.table)
        .where('id', id)
        .update({
          payload,
          last_activity: now,
        });
      return;
    }

    await new QueryBuilder(this.connection, this.table).insert({
      id,
      payload,
      last_activity: now,
      user_id: data['auth.user_id'] ?? null,
      ip_address: null,
      user_agent: null,
    });
  }

  async destroy(id: string): Promise<void> {
    await new QueryBuilder(this.connection, this.table).where('id', id).delete();
  }

  async pruneExpired(lifetimeMinutes: number): Promise<void> {
    const cutoff = Math.floor(Date.now() / 1000) - lifetimeMinutes * 60;
    await new QueryBuilder(this.connection, this.table)
      .where('last_activity', '<', cutoff)
      .delete();
  }
}

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Record<string, unknown>>();

  async read(id: string): Promise<Record<string, unknown>> {
    return { ...(this.sessions.get(id) ?? {}) };
  }

  async write(
    id: string,
    data: Record<string, unknown>,
    _lifetimeMinutes: number,
  ): Promise<void> {
    this.sessions.set(id, { ...data });
  }

  async destroy(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}