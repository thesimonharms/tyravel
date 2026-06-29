import { describe, expect, it } from 'vitest';
import { StorageManager } from '@pondoknusa/storage';
import { registerR2StorageDriver } from './register.js';
import { R2Disk } from './r2-disk.js';

describe('R2Disk', () => {
  it('registers the r2 driver with StorageManager', () => {
    registerR2StorageDriver();

    const manager = new StorageManager({
      default: 'r2',
      disks: {
        r2: {
          driver: 'r2',
          key: 'test-key',
          secret: 'test-secret',
          accountId: 'account-123',
          bucket: 'uploads',
        },
      },
    });

    expect(manager.disk()).toBeInstanceOf(R2Disk);
  });

  it('builds public URLs from a custom domain when configured', () => {
    const disk = new R2Disk({
      driver: 'r2',
      key: 'test-key',
      secret: 'test-secret',
      accountId: 'account-123',
      bucket: 'uploads',
      url: 'https://cdn.example.com',
    });

    expect(disk.url('avatars/user.png')).toBe(
      'https://cdn.example.com/avatars/user.png',
    );
  });

  it('generates presigned temporary URLs', async () => {
    const disk = new R2Disk({
      driver: 'r2',
      key: 'test-key',
      secret: 'test-secret',
      accountId: 'account-123',
      bucket: 'uploads',
    });

    const url = await disk.temporaryUrl('private/report.pdf', 600);
    expect(url).toContain('account-123.r2.cloudflarestorage.com');
    expect(url).toContain('private/report.pdf');
    expect(url).toContain('X-Amz-Algorithm');
    expect(url).toContain('X-Amz-Expires=600');
  });
});