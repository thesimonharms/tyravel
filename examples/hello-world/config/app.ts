import { env } from '@tyravel/config';

export default {
  name: env('APP_NAME', 'hello-world'),
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
} as const;