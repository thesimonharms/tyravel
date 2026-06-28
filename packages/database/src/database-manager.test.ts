import { describe, expect, it } from 'vitest';
import { DatabaseManager } from './database-manager.js';
import type { DatabaseConnection, QueryResult } from './connection.js';
import type { ConnectionConfig } from './types.js';
import { SqliteGrammar } from './grammar.js';

class EchoConnection implements DatabaseConnection {
  readonly grammar = new SqliteGrammar();

  async query(): Promise<QueryResult> {
    return { rows: [], changes: 0 };
  }

  async exec(): Promise<void> {}

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }
}

describe('DatabaseManager', () => {
  it('resolves built-in sqlite connections', () => {
    const manager = new DatabaseManager({
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', database: ':memory:' },
      },
    });

    expect(manager.connection()).toBeDefined();
  });

  it('resolves extended drivers', () => {
    DatabaseManager.extend('echo', () => new EchoConnection());

    const manager = new DatabaseManager({
      default: 'echo',
      connections: {
        echo: { driver: 'echo' },
      },
    });

    const connection = manager.connection();
    expect(connection.grammar).toBeInstanceOf(SqliteGrammar);
    expect(connection.query).toBeTypeOf('function');
  });

  it('lists configured connection names', () => {
    const manager = new DatabaseManager({
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', database: ':memory:' },
        analytics: { driver: 'sqlite', database: ':memory:' },
      },
    });

    expect(manager.listConnectionNames()).toEqual(['sqlite', 'analytics']);
  });

  it('throws for unknown drivers with a helpful message', () => {
    const manager = new DatabaseManager({
      default: 'missing',
      connections: {
        missing: { driver: 'missing' } as ConnectionConfig,
      },
    });

    expect(() => manager.connection()).toThrow(
      'Unsupported database driver [missing]. Register it with DatabaseManager.extend() or install a driver package.',
    );
  });
});