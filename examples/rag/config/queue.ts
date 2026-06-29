import { env } from '@pondoknusa/config';

export default {
  default: env('QUEUE_CONNECTION', 'database'),
  connections: {
    database: {
      driver: 'database',
      table: 'jobs',
      connection: 'sqlite',
      retryAfter: 90,
    },
  },
  failed: {
    table: 'failed_jobs',
  },
} as const;