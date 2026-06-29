import type { NotificationsConfig } from '@pondoknusa/notifications';

export default {
  table: 'notifications',
  connection: 'sqlite',
  queue: 'default',
  queueConnection: 'database',
} satisfies NotificationsConfig;