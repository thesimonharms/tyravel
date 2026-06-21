import { env } from '@tyravel/config';

export default {
  default: env('DB_CONNECTION', 'sqlite'),
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: env('DB_DATABASE', 'database/database.sqlite'),
    },
  },
} as const;