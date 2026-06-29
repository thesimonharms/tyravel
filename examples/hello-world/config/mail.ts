import type { MailConfig } from '@pondoknusa/mail';
import { env, envInt } from '@pondoknusa/config';

export default {
  default: env('MAIL_MAILER', 'log'),
  from: {
    address: env('MAIL_FROM_ADDRESS', 'hello@example.com'),
    name: env('MAIL_FROM_NAME', 'Pondoknusa'),
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
  queueConnection: env('QUEUE_CONNECTION', 'database'),
} satisfies MailConfig;