import type { PgConnectionConfig } from '@pondoknusa/database-pg';
import { env, envInt } from '@pondoknusa/config';

export default {
  default: env('DB_CONNECTION', 'sqlite'),
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: env('DB_DATABASE', 'database/database.sqlite'),
    },
    postgres: {
      driver: 'postgres',
      host: env('DB_HOST', '127.0.0.1'),
      port: envInt('DB_PORT', 5432),
      database: env('DB_DATABASE', 'pondoknusa'),
      username: env('DB_USERNAME', 'postgres'),
      password: env('DB_PASSWORD', ''),
    } satisfies PgConnectionConfig,
  },
} as const;