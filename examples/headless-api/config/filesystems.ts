import type { StorageConfig } from '@tyravel/storage';
import { env } from '@tyravel/config';

export default {
  default: env('FILESYSTEM_DISK', 'local'),
  disks: {
    local: {
      driver: 'local',
      root: 'storage/app',
    },
  },
} satisfies StorageConfig;
