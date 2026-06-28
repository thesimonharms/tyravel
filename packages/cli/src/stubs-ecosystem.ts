import type { NewProjectOptions } from './new-project-options.js';

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

/** Local disk by default. For S3/R2/Supabase, add the matching @tyravel/storage-* driver package and service provider. */
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
    limits: {
      api: { limit: 60, windowMs: 60_000 },
    },
  },
} satisfies HttpConfig;
`;
}

export function healthConfig(): string {
  return `import type { HealthConfig } from '@tyravel/core';

export default {
  enabled: true,
  path: '/health',
  livenessPath: '/health/live',
  readinessPath: '/health/ready',
  checks: {
    database: true,
    redis: false,
  },
} satisfies HealthConfig;
`;
}

export { cacheConfig } from './stubs-project.js';

export function broadcastingConfig(options: NewProjectOptions): string {
  const defaultConnection = options.redis ? 'websocket' : 'log';

  return `import type { BroadcastingConfig } from '@tyravel/broadcasting';
import { env, envInt } from '@tyravel/config';

export default {
  default: env('BROADCAST_CONNECTION', '${defaultConnection}'),
  connections: {
    null: { driver: 'null' },
    log: { driver: 'log' },
    websocket: {
      driver: 'websocket',
      redisConnection: env('REDIS_CONNECTION', 'default'),
      channel: env('BROADCAST_REDIS_CHANNEL', 'tyravel:broadcast'),
      path: '/tyravel/ws',
    },
  },
  queueConnection: env('QUEUE_CONNECTION', 'database'),
  queue: 'default',
} satisfies BroadcastingConfig;
`;
}

export function broadcastChannels(): string {
  return `import { Broadcast } from '@tyravel/core';

/**
 * Register channels with the same private-/presence- prefixes Echo sends.
 *
 * Client (Echo):  echo.channel('orders')
 * Server:         Broadcast.channel('orders', ...)
 *
 * Client (Echo):  echo.private('orders.' + orderId)
 * Server:         Broadcast.channel('private-orders.{orderId}', ...)
 *
 * Client (Echo):  echo.private('App.Models.User.' + userId)
 * Server:         Broadcast.channel('private-App.Models.User.{id}', ...)
 */
Broadcast.channel('orders', () => true);

Broadcast.channel('private-orders.{orderId}', (user, orderId) => {
  return Boolean(user) && String(orderId).length > 0;
});

Broadcast.channel('private-App.Models.User.{id}', (user, id) => {
  if (!user || typeof user !== 'object' || !('id' in user)) {
    return false;
  }

  return String((user as { id: number | string }).id) === String(id);
});

Broadcast.channel('presence-App.Room.{roomId}', (user, roomId) => {
  return Boolean(user) && String(roomId).length > 0;
});
`;
}

export function echoBootstrap(_options: NewProjectOptions): string {
  return `import { Echo, readEchoConfigFromDocument } from '@tyravel/echo';

const config = readEchoConfigFromDocument();
if (!config) {
  // Broadcasting is disabled (log/null driver) — @echo renders no client bundle.
} else {
  const echo = new Echo(config);

  if (typeof window !== 'undefined') {
    (window as Window & { Echo?: Echo }).Echo = echo;
  }
}
`;
}

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