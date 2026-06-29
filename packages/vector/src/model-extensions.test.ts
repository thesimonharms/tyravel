import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import '@pondoknusa/vector';
import { MemoryVectorSearchDriver, registerVectorSearchDriver } from './index.js';

class Note extends Model {
  static override table = 'notes';
  static override vectorColumn = 'embedding';
}

describe('Model vector extensions', () => {
  it('supports Model.similarTo()', async () => {
    registerVectorSearchDriver(new MemoryVectorSearchDriver());
    const connection = new SqliteConnection(':memory:');
    Note.useConnection(connection);
    await connection.exec(`
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        embedding TEXT NOT NULL
      )
    `);

    await Note.query().insert({
      title: 'Vector search',
      embedding: JSON.stringify([1, 0]),
    });
    await Note.query().insert({
      title: 'Other topic',
      embedding: JSON.stringify([0, 1]),
    });

    const results = await Note.similarTo([1, 0], { limit: 1 }).getModels<Note>();
    expect(results[0]?.getAttribute('title')).toBe('Vector search');
  });

  it('supports query builder scopeNearest()', async () => {
    registerVectorSearchDriver(new MemoryVectorSearchDriver());
    const connection = new SqliteConnection(':memory:');
    Note.useConnection(connection);
    await connection.exec(`
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        embedding TEXT NOT NULL
      )
    `);

    await Note.query().insert({
      title: 'Scoped match',
      embedding: JSON.stringify([1, 0]),
    });
    await Note.query().insert({
      title: 'Filtered out',
      embedding: JSON.stringify([1, 0]),
    });

    const results = await Note.query()
      .where('title', 'Scoped match')
      .scopeNearest([1, 0], { limit: 1 })
      .getModels<Note>();

    expect(results).toHaveLength(1);
    expect(results[0]?.getAttribute('title')).toBe('Scoped match');
  });
});