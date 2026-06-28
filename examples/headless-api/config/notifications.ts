import type { NotificationsConfig } from '@tyravel/notifications';

export default {
  table: 'notifications',
  connection: 'sqlite',
  queue: 'default',
  queueConnection: 'database',
} satisfies NotificationsConfig;
