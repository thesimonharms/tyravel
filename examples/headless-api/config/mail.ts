import type { MailConfig } from '@tyravel/mail';
import { env, envInt } from '@tyravel/config';

export default {
  default: env('MAIL_MAILER', 'log'),
  from: {
    address: env('MAIL_FROM_ADDRESS', 'hello@example.com'),
    name: env('MAIL_FROM_NAME', 'Tyravel'),
  },
  connections: {
    log: { driver: 'log' },
    array: { driver: 'array' },
    smtp: {
      driver: 'smtp',
      host: env('MAIL_HOST', '127.0.0.1'),
      port: envInt('MAIL_PORT', 587),
      username: env('MAIL_USERNAME', ''),
      password: env('MAIL_PASSWORD', ''),
      encryption: env('MAIL_ENCRYPTION', 'tls'),
    },
  },
  queue: 'default',
  queueConnection: 'database',
} satisfies MailConfig;
