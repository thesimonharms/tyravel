import { StorageManager, type DiskConfig } from '@pondoknusa/storage';
import { SupabaseDisk } from './supabase-disk.js';
import type { SupabaseDiskConfig } from './types.js';

export function registerSupabaseStorageDriver(): void {
  StorageManager.extend(
    'supabase',
    (config: DiskConfig) => new SupabaseDisk(config as unknown as SupabaseDiskConfig),
  );
}