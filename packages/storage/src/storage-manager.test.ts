import { describe, expect, it } from 'vitest';
import { StorageManager } from './storage-manager.js';
import type { DiskConfig, Filesystem } from './types.js';

class MemoryDisk implements Filesystem {
  private readonly files = new Map<string, Buffer>();

  async put(path: string, contents: string | Buffer): Promise<void> {
    this.files.set(path, Buffer.isBuffer(contents) ? contents : Buffer.from(contents));
  }

  async get(path: string): Promise<Buffer | null> {
    return this.files.get(path) ?? null;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async delete(path: string): Promise<boolean> {
    return this.files.delete(path);
  }

  url(path: string): string {
    return `/memory/${path}`;
  }
}

describe('StorageManager', () => {
  it('resolves built-in local disks', async () => {
    const manager = new StorageManager({
      default: 'local',
      disks: {
        local: { driver: 'local', root: process.cwd() },
      },
    });

    const disk = manager.disk();
    expect(disk).toBeDefined();
    expect(disk.url('file.txt')).toBe('/file.txt');
  });

  it('resolves extended drivers', async () => {
    StorageManager.extend('memory', () => new MemoryDisk());

    const manager = new StorageManager({
      default: 'memory',
      disks: {
        memory: { driver: 'memory' },
      },
    });

    const disk = manager.disk();
    await disk.put('note.txt', 'hello');
    expect((await disk.get('note.txt'))?.toString('utf8')).toBe('hello');
  });

  it('throws for unknown drivers with a helpful message', () => {
    const manager = new StorageManager({
      default: 'missing',
      disks: {
        missing: { driver: 'missing' } as DiskConfig,
      },
    });

    expect(() => manager.disk()).toThrow(
      'Unsupported storage driver [missing]. Register it with StorageManager.extend() or install a driver package.',
    );
  });
});