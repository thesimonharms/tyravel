import type { StorageConfig } from '@pondoknusa/storage';
import { env } from '@pondoknusa/config';

export default {
  default: env('FILESYSTEM_DISK', 'local'),
  disks: {
    local: {
      driver: 'local',
      root: 'storage/app',
    },
  },
} satisfies StorageConfig;