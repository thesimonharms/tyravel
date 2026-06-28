import type { CacheConfig } from '@tyravel/cache';
import { env } from '@tyravel/config';

export default {
  default: env('CACHE_STORE', 'file'),
  prefix: 'tyravel',
  connections: {
    file: {
      driver: 'file',
      path: 'storage/framework/cache',
    },
    array: { driver: 'array' },
  },
} satisfies CacheConfig;
