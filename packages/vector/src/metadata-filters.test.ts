import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import './index.js';
import { registerInMemoryVectorSearchDriver } from './register-local.js';

class Chunk extends Model {
  static override table = 'chunks';
  static override vectorColumn = 'embedding';
}

describe('metadata filters', () => {
  it('filters vector results by JSON metadata predicates', async () => {
    registerInMemoryVectorSearchDriver();
    const connection = new SqliteConnection(':memory:');
    Chunk.useConnection(connection);
    await connection.exec(`
      CREATE TABLE chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        metadata TEXT,
        embedding TEXT NOT NULL
      )
    `);

    await Chunk.query().insert({
      content: 'Public docs',
      metadata: JSON.stringify({ visibility: 'public', topic: 'rag' }),
      embedding: JSON.stringify([1, 0]),
    });
    await Chunk.query().insert({
      content: 'Private notes',
      metadata: JSON.stringify({ visibility: 'private', topic: 'rag' }),
      embedding: JSON.stringify([1, 0]),
    });

    const results = await Chunk.similarTo([1, 0], {
      limit: 5,
      metadataFilters: [{ key: 'visibility', value: 'public' }],
    }).get();

    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('Public docs');
  });
});