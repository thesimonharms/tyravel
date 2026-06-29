import { env, s } from '@pondoknusa/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
  connections: s.object({
    sqlite: s.object({
      driver: s.string({ enum: ['sqlite'] }),
      database: s.string({ required: true, minLength: 1 }),
    }),
  }),
});

export default {
  default: env('DB_CONNECTION', 'sqlite'),
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: env('DB_DATABASE', 'database/database.sqlite'),
    },
  },
} as const;
