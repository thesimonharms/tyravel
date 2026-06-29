import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { ConversationMemory } from './conversation.js';

class ConversationMessage extends Model {
  static override table = 'conversation_messages';
}

describe('ConversationMemory', () => {
  it('stores and reads session-scoped messages', async () => {
    const connection = new SqliteConnection(':memory:');
    ConversationMessage.useConnection(connection);
    await connection.exec(`
      CREATE TABLE conversation_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL
      )
    `);

    const memory = new ConversationMemory(ConversationMessage, 'session-1');
    await memory.add('user', 'Hello');
    await memory.add('assistant', 'Hi there');

    const history = await memory.history();
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe('user');
    expect(history[1]?.content).toBe('Hi there');
  });
});