export function cacheConfig(): string {
  return `import type { CacheConfig } from '@tyravel/cache';

export default {
  default: 'file',
  prefix: 'tyravel',
  connections: {
    file: {
      driver: 'file',
      path: 'storage/framework/cache',
    },
    array: { driver: 'array' },
  },
} satisfies CacheConfig;
`;
}

export function mailConfig(): string {
  return `import type { MailConfig } from '@tyravel/mail';

export default {
  default: 'log',
  from: {
    address: 'hello@example.com',
    name: 'Tyravel',
  },
  connections: {
    log: { driver: 'log' },
    array: { driver: 'array' },
    smtp: {
      driver: 'smtp',
      host: process.env.MAIL_HOST ?? '127.0.0.1',
      port: Number(process.env.MAIL_PORT ?? 587),
      username: process.env.MAIL_USERNAME,
      password: process.env.MAIL_PASSWORD,
      encryption: 'tls',
    },
  },
  queue: 'default',
  queueConnection: 'database',
} satisfies MailConfig;
`;
}

export function notificationsConfig(): string {
  return `import type { NotificationsConfig } from '@tyravel/notifications';

export default {
  table: 'notifications',
  connection: 'sqlite',
  queue: 'default',
  queueConnection: 'database',
} satisfies NotificationsConfig;
`;
}

export function notificationsTableMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateNotificationsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('notifications', (table) => {
      table.string('id', 36);
      table.string('type');
      table.string('notifiable_type');
      table.string('notifiable_id');
      table.text('data');
      table.timestamp('read_at').nullable();
      table.timestamp('created_at');
      table.unique(['id']);
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('notifications');
  }
}
`;
}