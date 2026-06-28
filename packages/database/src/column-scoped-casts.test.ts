import { describe, expect, it } from 'vitest';
import { Model } from './model.js';
import {
  normalizeSelectColumn,
  resolveCastsForColumns,
  type Cast,
  type ModelCastMap,
} from './model-casts.js';
import { SqliteConnection } from './sqlite-connection.js';

class CountingCast implements Cast {
  readonly calls = { get: 0, set: 0 };

  get(value: unknown): unknown {
    this.calls.get++;
    return value;
  }

  set(value: unknown): unknown {
    this.calls.set++;
    return value;
  }
}

class CastedPost extends Model {
  static override table = 'casted_posts';
  static override casts: ModelCastMap = {
    title: 'string',
    metadata: 'json',
  };
}

describe('resolveCastsForColumns', () => {
  const casts: ModelCastMap = {
    id: 'number',
    title: 'string',
    metadata: 'json',
    published_at: 'datetime',
  };

  it('returns the full map when selecting all columns', () => {
    expect(resolveCastsForColumns(casts, ['*'])).toBe(casts);
    expect(resolveCastsForColumns(casts, [])).toBe(casts);
  });

  it('keeps only casts for selected columns', () => {
    expect(resolveCastsForColumns(casts, ['id', 'title'])).toEqual({
      id: 'number',
      title: 'string',
    });
  });

  it('normalizes qualified and aliased select columns', () => {
    expect(normalizeSelectColumn('casted_posts.metadata')).toBe('metadata');
    expect(normalizeSelectColumn('metadata as meta_json')).toBe('meta_json');
    expect(
      resolveCastsForColumns(casts, ['casted_posts.title', 'metadata as meta_json']),
    ).toEqual({
      title: 'string',
    });
  });
});

describe('Model.select column-scoped casts', () => {
  it('applies casts only for selected columns during hydration', async () => {
    const connection = new SqliteConnection(':memory:');
    const titleCast = new CountingCast();
    const metadataCast = new CountingCast();

    class TrackedPost extends Model {
      static override table = 'tracked_posts';
      static override casts: ModelCastMap = {
        title: titleCast,
        metadata: metadataCast,
      };
    }

    TrackedPost.useConnection(connection);
    await connection.exec(`
      CREATE TABLE tracked_posts (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        metadata TEXT NOT NULL
      )
    `);

    await TrackedPost.create({
      title: 'Hello',
      metadata: '{"tags":["news"]}',
    });

    const pruned = await TrackedPost.select('id', 'title').getModels();
    const full = await TrackedPost.select('id', 'title', 'metadata').getModels();

    expect(pruned[0]?.getAttribute('title')).toBe('Hello');
    expect(pruned[0]?.getAttribute('metadata')).toBeUndefined();
    expect(full[0]?.getAttribute('metadata')).toBe('{"tags":["news"]}');

    expect(titleCast.calls.get).toBe(2);
    expect(metadataCast.calls.get).toBe(1);
  });

  it('still casts json attributes on pruned selects when the column is included', async () => {
    const connection = new SqliteConnection(':memory:');
    CastedPost.useConnection(connection);

    await connection.exec(`
      CREATE TABLE casted_posts (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        metadata TEXT NOT NULL
      )
    `);

    await CastedPost.create({
      title: 'Hello',
      metadata: '{"enabled":true}',
    });

    const row = (await CastedPost.select('metadata').getModels())[0]!;
    expect(row.getAttribute('metadata')).toEqual({ enabled: true });
  });

  it('recomputes active casts when select changes on a cloned builder', async () => {
    const connection = new SqliteConnection(':memory:');
    const metadataCast = new CountingCast();

    class ClonePost extends Model {
      static override table = 'clone_posts';
      static override casts: ModelCastMap = {
        title: 'string',
        metadata: metadataCast,
      };
    }

    ClonePost.useConnection(connection);
    await connection.exec(`
      CREATE TABLE clone_posts (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        metadata TEXT NOT NULL
      )
    `);

    await ClonePost.create({ title: 'Hi', metadata: '{}' });

    const builder = ClonePost.select('id', 'title');
    await builder.getModels();

    metadataCast.calls.get = 0;
    await builder.clone().select('id', 'metadata').getModels();

    expect(metadataCast.calls.get).toBe(1);
  });
});