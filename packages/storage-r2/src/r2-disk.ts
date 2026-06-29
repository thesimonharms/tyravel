import { S3Disk } from '@pondoknusa/storage-aws-s3';
import type { R2DiskConfig } from './types.js';

export class R2Disk extends S3Disk {
  constructor(config: R2DiskConfig) {
    super({
      driver: 's3',
      key: config.key,
      secret: config.secret,
      region: 'auto',
      bucket: config.bucket,
      url: config.url,
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    });
  }
}