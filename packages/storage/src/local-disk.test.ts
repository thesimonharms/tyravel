import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalDisk } from './local-disk.js';

describe('LocalDisk', () => {
  let directory = '';
  let disk: LocalDisk;

  afterEach(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      directory = '';
    }
  });

  it('stores, reads, checks, and deletes files', async () => {
    directory = await mkdtemp(join(tmpdir(), 'pondoknusa-storage-'));
    disk = new LocalDisk(directory);

    await disk.put('notes/hello.txt', 'hello world');
    expect(await disk.exists('notes/hello.txt')).toBe(true);
    expect((await disk.get('notes/hello.txt'))?.toString('utf8')).toBe('hello world');
    expect(disk.url('notes/hello.txt')).toBe('/notes/hello.txt');
    expect(await disk.delete('notes/hello.txt')).toBe(true);
    expect(await disk.exists('notes/hello.txt')).toBe(false);
  });

  it('rejects path traversal', async () => {
    directory = await mkdtemp(join(tmpdir(), 'pondoknusa-storage-'));
    disk = new LocalDisk(directory);

    await expect(disk.put('../escape.txt', 'nope')).rejects.toThrow('Invalid storage path');
  });
});