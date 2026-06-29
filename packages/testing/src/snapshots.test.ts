import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertJsonSnapshot } from './snapshots.js';

describe('snapshot assertions', () => {
  it('writes and compares JSON snapshots', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pondoknusa-snap-'));
    await assertJsonSnapshot({ ok: true }, 'health', { directory, update: true });
    const file = await readFile(join(directory, 'health.snap'), 'utf8');
    expect(file).toContain('"ok": true');
    await assertJsonSnapshot({ ok: true }, 'health', { directory });
  });
});