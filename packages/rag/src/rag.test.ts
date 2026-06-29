import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { MemoryVectorSearchDriver, registerVectorSearchDriver } from '@pondoknusa/vector';
import { Rag } from './rag.js';
import { buildGroundedPrompt } from './prompt.js';

class Document extends Model {
  static override table = 'documents';
  static override vectorColumn = 'embedding';
}

describe('Rag', () => {
  it('retrieves ranked chunks from vector search', async () => {
    registerVectorSearchDriver(new MemoryVectorSearchDriver());
    const connection = new SqliteConnection(':memory:');
    Document.useConnection(connection);
    await connection.exec(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT,
        embedding TEXT NOT NULL
      )
    `);

    await Document.query().insert({
      content: 'Pondoknusa uses native WebSockets for broadcasting.',
      source: 'readme',
      metadata: '{}',
      embedding: JSON.stringify([1, 0, 0]),
    });
    await Document.query().insert({
      content: 'Unrelated database migration notes.',
      source: 'notes',
      metadata: '{}',
      embedding: JSON.stringify([0, 1, 0]),
    });

    const rag = new Rag({
      model: Document,
      embed: async () => [1, 0, 0],
    });

    const chunks = await rag.retrieve('How does broadcasting work?', { topK: 1, minScore: 0.5 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toContain('WebSockets');
    expect(buildGroundedPrompt('Q?', chunks)).toContain('[1]');
  });
});