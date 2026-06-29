import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { MemoryVectorSearchDriver, registerVectorSearchDriver, similarTo } from './index.js';

class Article extends Model {
  static override table = 'articles';
  static override vectorColumn = 'embedding';
}

describe('VectorSearch', () => {
  it('returns nearest models via similarTo()', async () => {
    registerVectorSearchDriver(new MemoryVectorSearchDriver());
    const connection = new SqliteConnection(':memory:');
    Article.useConnection(connection);
    await connection.exec(`
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        embedding TEXT NOT NULL
      )
    `);

    await Article.query().insert({
      title: 'Native WebSockets',
      embedding: JSON.stringify([1, 0]),
    });
    await Article.query().insert({
      title: 'Database migrations',
      embedding: JSON.stringify([0, 1]),
    });

    const results = await similarTo(Article, [1, 0], { limit: 1 }).getModels<Article>();
    expect(results).toHaveLength(1);
    expect(results[0]?.getAttribute('title')).toBe('Native WebSockets');
  });
});