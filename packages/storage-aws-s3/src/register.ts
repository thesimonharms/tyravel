import { StorageManager, type DiskConfig } from '@tyravel/storage';
import { S3Disk } from './s3-disk.js';
import type { S3DiskConfig } from './types.js';

export function registerAwsS3StorageDriver(): void {
  StorageManager.extend(
    's3',
    (config: DiskConfig) => new S3Disk(config as unknown as S3DiskConfig),
  );
}