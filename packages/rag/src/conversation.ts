import type { ModelStatic } from '@pondoknusa/database';

export type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationMessageRecord {
  sessionId: string;
  role: ConversationRole;
  content: string;
}

export interface ConversationMemoryOptions {
  sessionColumn?: string;
  roleColumn?: string;
  contentColumn?: string;
}

export class ConversationMemory {
  private readonly sessionColumn: string;
  private readonly roleColumn: string;
  private readonly contentColumn: string;

  constructor(
    private readonly model: ModelStatic,
    private readonly sessionId: string,
    options: ConversationMemoryOptions = {},
  ) {
    this.sessionColumn = options.sessionColumn ?? 'session_id';
    this.roleColumn = options.roleColumn ?? 'role';
    this.contentColumn = options.contentColumn ?? 'content';
  }

  async add(role: ConversationRole, content: string): Promise<number | bigint | undefined> {
    return this.model.query().insert({
      [this.sessionColumn]: this.sessionId,
      [this.roleColumn]: role,
      [this.contentColumn]: content,
    });
  }

  async history(limit = 20): Promise<ConversationMessageRecord[]> {
    const rows = await this.model
      .query()
      .where(this.sessionColumn, this.sessionId)
      .orderBy('id', 'asc')
      .limit(limit)
      .get();

    return rows.map((row) => ({
      sessionId: String(row[this.sessionColumn] ?? this.sessionId),
      role: String(row[this.roleColumn] ?? 'user') as ConversationRole,
      content: String(row[this.contentColumn] ?? ''),
    }));
  }

  async clear(): Promise<void> {
    await this.model.query().where(this.sessionColumn, this.sessionId).delete();
  }
}