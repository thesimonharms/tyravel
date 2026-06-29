import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageManager } from '@pondoknusa/storage';
import { registerSupabaseStorageDriver } from './register.js';
import { SupabaseDisk } from './supabase-disk.js';

const config = {
  driver: 'supabase' as const,
  url: 'https://example.supabase.co',
  key: 'service-role-key',
  bucket: 'uploads',
};

describe('SupabaseDisk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the supabase driver with StorageManager', () => {
    registerSupabaseStorageDriver();

    const manager = new StorageManager({
      default: 'supabase',
      disks: { supabase: config },
    });

    expect(manager.disk()).toBeInstanceOf(SupabaseDisk);
  });

  it('uploads objects with upsert enabled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const disk = new SupabaseDisk(config);

    await disk.put('avatars/user.png', Buffer.from('png-data'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/storage/v1/object/uploads/avatars/user.png',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer service-role-key',
          apikey: 'service-role-key',
          'x-upsert': 'true',
        }),
      }),
    );
  });

  it('downloads objects and returns null for missing files', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('file-bytes', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const disk = new SupabaseDisk(config);

    await expect(disk.get('docs/report.pdf')).resolves.toEqual(
      Buffer.from('file-bytes'),
    );
    await expect(disk.get('missing.txt')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('checks existence with HEAD requests', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const disk = new SupabaseDisk(config);

    await expect(disk.exists('present.txt')).resolves.toBe(true);
    await expect(disk.exists('absent.txt')).resolves.toBe(false);
  });

  it('deletes objects via the storage API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const disk = new SupabaseDisk(config);

    await expect(disk.delete('trash/old.txt')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/storage/v1/object/uploads/trash/old.txt',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('builds public URLs and custom public URL bases', () => {
    const disk = new SupabaseDisk(config);
    expect(disk.url('public/photo.jpg')).toBe(
      'https://example.supabase.co/storage/v1/object/public/uploads/public/photo.jpg',
    );

    const custom = new SupabaseDisk({
      ...config,
      publicUrl: 'https://cdn.example.com/assets',
    });
    expect(custom.url('public/photo.jpg')).toBe(
      'https://cdn.example.com/assets/public/photo.jpg',
    );
  });

  it('creates signed temporary URLs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL: '/storage/v1/object/sign/uploads/private/report.pdf?token=abc',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const disk = new SupabaseDisk(config);

    await expect(disk.temporaryUrl('private/report.pdf', 900)).resolves.toBe(
      'https://example.supabase.co/storage/v1/object/sign/uploads/private/report.pdf?token=abc',
    );
  });

  it('returns absolute signed URLs unchanged', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL:
            'https://example.supabase.co/storage/v1/object/sign/uploads/private/report.pdf?token=abc',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const disk = new SupabaseDisk(config);

    await expect(disk.temporaryUrl('private/report.pdf', 900)).resolves.toBe(
      'https://example.supabase.co/storage/v1/object/sign/uploads/private/report.pdf?token=abc',
    );
  });
});