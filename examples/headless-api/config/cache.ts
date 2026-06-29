import type { CacheConfig } from '@pondoknusa/cache';
import { env } from '@pondoknusa/config';

export default {
  default: env('CACHE_STORE', 'file'),
  prefix: 'pondoknusa',
  connections: {
    file: {
      driver: 'file',
      path: 'storage/framework/cache',
    },
    array: { driver: 'array' },
  },
} satisfies CacheConfig;
