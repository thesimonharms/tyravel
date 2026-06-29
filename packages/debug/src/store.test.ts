import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DebugStore } from './store.js';

describe('DebugStore', () => {
  it('persists and clears entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pondoknusa-debug-'));
    const path = join(dir, 'entries.json');
    const store = new DebugStore(10, path);

    store.push({
      id: 'entry-1',
      method: 'GET',
      path: '/users',
      status: 200,
      durationMs: 12,
      timestamp: Date.now(),
      timeline: [],
      queries: [],
      warnings: [],
    });

    await store.clear();
    const raw = await readFile(path, 'utf8');
    expect(JSON.parse(raw)).toEqual([]);
    expect(store.all()).toEqual([]);
  });
});