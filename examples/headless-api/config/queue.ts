import { env, s } from '@pondoknusa/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
});

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
