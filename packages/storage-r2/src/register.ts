import { StorageManager, type DiskConfig } from '@pondoknusa/storage';
import { R2Disk } from './r2-disk.js';
import type { R2DiskConfig } from './types.js';

export function registerR2StorageDriver(): void {
  StorageManager.extend(
    'r2',
    (config: DiskConfig) => new R2Disk(config as unknown as R2DiskConfig),
  );
}