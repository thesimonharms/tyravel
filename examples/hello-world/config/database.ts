import { env, envInt } from '@tyravel/config';

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
      database: env('DB_DATABASE', 'tyravel'),
      username: env('DB_USERNAME', 'postgres'),
      password: env('DB_PASSWORD', ''),
    },
    mysql: {
      driver: 'mysql',
      host: env('DB_HOST', '127.0.0.1'),
      port: envInt('DB_PORT', 3306),
      database: env('DB_DATABASE', 'tyravel'),
      username: env('DB_USERNAME', 'root'),
      password: env('DB_PASSWORD', ''),
    },
  },
} as const;