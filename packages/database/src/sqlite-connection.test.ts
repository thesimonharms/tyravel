import { access } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteConnection } from './sqlite-connection.js';

describe('SqliteConnection', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('creates parent directories asynchronously for file-backed databases', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-sqlite-'));
    const databasePath = join(tempDir, 'nested', 'app.sqlite');

    const connection = await SqliteConnection.connect(databasePath, tempDir);
    await connection.exec('CREATE TABLE items (id INTEGER PRIMARY KEY)');
    await connection.close();

    await expect(access(databasePath)).resolves.toBeUndefined();
  });

  it('supports in-memory databases via connect()', async () => {
    const connection = await SqliteConnection.connect(':memory:');
    const result = await connection.query('SELECT 1 AS value');
    await connection.close();

    expect(result.rows).toEqual([{ value: 1 }]);
  });
});