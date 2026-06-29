import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import './index.js';
import { registerSqliteVectorSearchDriver } from './register-local.js';

class Article extends Model {
  static override table = 'articles';
  static override vectorColumn = 'embedding';
}

describe('hybrid search', () => {
  it('blends vector and text scores', async () => {
    registerSqliteVectorSearchDriver();
    const connection = new SqliteConnection(':memory:');
    Article.useConnection(connection);
    await connection.exec(`
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL
      )
    `);

    await Article.query().insert({
      title: 'Broadcasting',
      content: 'Pondoknusa uses native WebSockets for broadcasting.',
      embedding: JSON.stringify([1, 0]),
    });
    await Article.query().insert({
      title: 'Database',
      content: 'Migrations and models.',
      embedding: JSON.stringify([0.9, 0.1]),
    });

    const results = await Article.similarTo([1, 0], {
      limit: 1,
      hybrid: {
        textQuery: 'WebSockets broadcasting',
        textColumn: 'content',
        vectorWeight: 0.4,
      },
    }).get();

    expect(results[0]?.content).toContain('WebSockets');
  });
});