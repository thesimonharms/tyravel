export function logConfig(): string {
  return `import type { LogConfig } from '@tyravel/log';
import { env } from '@tyravel/config';

export default {
  default: env('LOG_CHANNEL', 'stack'),
  channels: {
    stdout: { channel: 'stdout' },
    file: {
      channel: 'file',
      path: 'storage/logs/tyravel.log',
    },
    stack: {
      channel: 'stack',
      channels: ['stdout', 'file'],
    },
  },
} satisfies LogConfig;
`;
}

/** Local disk by default. For S3, add @tyravel/storage-aws-s3 and AwsS3StorageServiceProvider. */
export function filesystemsConfig(): string {
  return `import type { StorageConfig } from '@tyravel/storage';
import { env } from '@tyravel/config';

export default {
  default: env('FILESYSTEM_DISK', 'local'),
  disks: {
    local: {
      driver: 'local',
      root: 'storage/app',
    },
  },
} satisfies StorageConfig;
`;
}

export function corsConfig(): string {
  return `import type { CorsConfig } from '@tyravel/core';

export default {
  enabled: true,
  origins: ['*'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  headers: ['Content-Type', 'Authorization'],
  credentials: false,
} satisfies CorsConfig;
`;
}

export function httpConfig(): string {
  return `import type { HttpConfig } from '@tyravel/core';

export default {
  trustedProxies: ['127.0.0.1', '::1'],
  throttle: {
    enabled: true,
    limit: 60,
    windowMs: 60_000,
  },
} satisfies HttpConfig;
`;
}

export function healthConfig(): string {
  return `import type { HealthConfig } from '@tyravel/core';

export default {
  enabled: true,
  path: '/health',
  checks: {
    database: true,
    redis: false,
  },
} satisfies HealthConfig;
`;
}

export { cacheConfig } from './stubs-project.js';

export function redisConfig(): string {
  return `import type { RedisConfig } from '@tyravel/redis';
import { env, envInt } from '@tyravel/config';

export default {
  default: env('REDIS_CONNECTION', 'default'),
  prefix: 'tyravel',
  connections: {
    default: {
      url: env('REDIS_URL', ''),
      host: env('REDIS_HOST', '127.0.0.1'),
      port: envInt('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', ''),
      database: envInt('REDIS_DB', 0),
    },
  },
} satisfies RedisConfig;
`;
}

export function mailConfig(): string {
  return `import type { MailConfig } from '@tyravel/mail';
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
`;
}

export function notificationsConfig(connection = 'sqlite'): string {
  return `import type { NotificationsConfig } from '@tyravel/notifications';

export default {
  table: 'notifications',
  connection: '${connection}',
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