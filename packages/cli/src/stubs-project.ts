import type { NewProjectOptions } from './new-project-options.js';

const CORE_VERSION = '^1.0.1';

export function projectPackageJson(name: string, options: NewProjectOptions): string {
  const dependencies: Record<string, string> = {
    '@tyravel/cache': CORE_VERSION,
    '@tyravel/collection': CORE_VERSION,
    '@tyravel/config': CORE_VERSION,
    '@tyravel/core': CORE_VERSION,
    '@tyravel/database': CORE_VERSION,
    '@tyravel/events': CORE_VERSION,
    '@tyravel/http': CORE_VERSION,
    '@tyravel/log': CORE_VERSION,
    '@tyravel/mail': CORE_VERSION,
    '@tyravel/notifications': CORE_VERSION,
    '@tyravel/queue': CORE_VERSION,
    '@tyravel/support': CORE_VERSION,
    '@tyravel/validation': CORE_VERSION,
    '@tyravel/views': CORE_VERSION,
    '@tyravel/echo': CORE_VERSION,
    '@tyravel/ssr': CORE_VERSION,
  };

  if (options.auth !== false) {
    dependencies['@tyravel/auth'] = CORE_VERSION;
  }

  if (options.database === 'mysql') {
    dependencies['@tyravel/database-mysql'] = CORE_VERSION;
  }
  if (options.database === 'postgres') {
    dependencies['@tyravel/database-pg'] = CORE_VERSION;
  }
  if (options.redis) {
    dependencies['@tyravel/redis-node'] = CORE_VERSION;
    dependencies['@tyravel/broadcasting-websocket'] = CORE_VERSION;
  }

  if (options.ai) {
    dependencies['@tyravel/graphql'] = CORE_VERSION;
    dependencies['@tyravel/rag'] = CORE_VERSION;
    dependencies['@tyravel/vector'] = CORE_VERSION;
    if (options.database === 'postgres') {
      dependencies['@tyravel/vector-pg'] = CORE_VERSION;
    }
  }

  return JSON.stringify(
    {
      name,
      private: true,
      type: 'module',
      scripts: {
        dev: 'tyravel dev',
        start: 'tyravel start',
        'dev:worker': 'tyravel queue:work',
        test: 'tyravel test',
        precommit: 'tyravel view:lint',
      },
      dependencies: {
        ...dependencies,
        '@tyravel/cli': CORE_VERSION,
      },
      devDependencies: {
        '@tyravel/testing': CORE_VERSION,
        vitest: '^3.2.4',
      },
    },
    null,
    2,
  );
}

export function mainEntry(options: NewProjectOptions): string {
  const driverImports: string[] = [];
  const driverProviders: string[] = [];

  if (options.database === 'mysql') {
    driverImports.push(
      "import { MysqlDatabaseServiceProvider } from '@tyravel/database-mysql';",
    );
    driverProviders.push('app.register(MysqlDatabaseServiceProvider);');
  } else if (options.database === 'postgres') {
    driverImports.push(
      "import { PgDatabaseServiceProvider } from '@tyravel/database-pg';",
    );
    driverProviders.push('app.register(PgDatabaseServiceProvider);');
  }

  if (options.redis) {
    driverImports.push("import { NodeRedisServiceProvider } from '@tyravel/redis-node';");
    driverProviders.push('app.register(NodeRedisServiceProvider);');
    driverImports.push(
      "import { WebSocketBroadcastServiceProvider } from '@tyravel/broadcasting-websocket';",
    );
    driverProviders.push('new WebSocketBroadcastServiceProvider(app).register();');
  }

  const coreImports = [
    'Application',
    'BroadcastServiceProvider',
    'CacheServiceProvider',
    'ConfigRepository',
    'ConfigServiceProvider',
    'LocaleServiceProvider',
    'LogServiceProvider',
    'DatabaseServiceProvider',
    ...(options.redis ? ['RedisServiceProvider'] : []),
    'EventServiceProvider',
    'HttpKernel',
    'MailServiceProvider',
    'NotificationServiceProvider',
    'QueueServiceProvider',
    'StorageServiceProvider',
    'prepareHttpServer',
    'setBroadcastApplication',
    'setCacheApplication',
    'setEventApplication',
    'setLangApplication',
    'setUrlApplication',
    'setLogApplication',
    'setMailApplication',
    'setNotificationApplication',
    'setQueueApplication',
    'setRouteApplication',
    'setStorageApplication',
    'setViewApplication',
    'ViewServiceProvider',
    'serve',
  ];

  const providerRegistrations = [
    'app.register(ConfigServiceProvider);',
    ...driverProviders,
    ...(options.redis ? ['app.register(RedisServiceProvider);'] : []),
    'app.register(DatabaseServiceProvider);',
    'app.register(CacheServiceProvider);',
    'app.register(StorageServiceProvider);',
    'app.register(LogServiceProvider);',
    'app.register(MailServiceProvider);',
    'app.register(NotificationServiceProvider);',
    'app.register(QueueServiceProvider);',
    'app.register(EventServiceProvider);',
    'app.register(BroadcastServiceProvider);',
    'app.register(ViewServiceProvider);',
    'app.register(LocaleServiceProvider);',
    'app.register(AppServiceProvider);',
  ];

  return `${driverImports.length > 0 ? `${driverImports.join('\n')}\n` : ''}import {
  ${coreImports.join(',\n  ')},
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/channels.js';
import './routes/web.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setLangApplication(app);
setUrlApplication(app);
setViewApplication(app);
setQueueApplication(app);
setEventApplication(app);
setBroadcastApplication(app);
setCacheApplication(app);
setStorageApplication(app);
setLogApplication(app);
setMailApplication(app);
setNotificationApplication(app);

${providerRegistrations.join('\n')}

await app.boot();

await prepareHttpServer(app, app.make(ConfigRepository));

const kernel = new HttpKernel(app);
await serve(kernel);
`;
}

export function databaseConfig(options: NewProjectOptions): string {
  if (options.database === 'mysql') {
    return `import type { MysqlConnectionConfig } from '@tyravel/database-mysql';
import { env, envInt, s } from '@tyravel/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
  connections: s.object({
    mysql: s.object({
      driver: s.string({ enum: ['mysql'] }),
      host: s.string({ required: true, minLength: 1 }),
      database: s.string({ required: true, minLength: 1 }),
    }),
  }),
});

export default {
  default: env('DB_CONNECTION', 'mysql'),
  connections: {
    mysql: {
      driver: 'mysql',
      host: env('DB_HOST', '127.0.0.1'),
      port: envInt('DB_PORT', 3306),
      database: env('DB_DATABASE', 'tyravel'),
      username: env('DB_USERNAME', 'root'),
      password: env('DB_PASSWORD', ''),
    } satisfies MysqlConnectionConfig,
  },
} as const;
`;
  }

  if (options.database === 'postgres') {
    return `import type { PgConnectionConfig } from '@tyravel/database-pg';
import { env, envInt, s } from '@tyravel/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
  connections: s.object({
    postgres: s.object({
      driver: s.string({ enum: ['postgres'] }),
      host: s.string({ required: true, minLength: 1 }),
      database: s.string({ required: true, minLength: 1 }),
    }),
  }),
});

export default {
  default: env('DB_CONNECTION', 'postgres'),
  connections: {
    postgres: {
      driver: 'postgres',
      host: env('DB_HOST', '127.0.0.1'),
      port: envInt('DB_PORT', 5432),
      database: env('DB_DATABASE', 'tyravel'),
      username: env('DB_USERNAME', 'postgres'),
      password: env('DB_PASSWORD', ''),
    } satisfies PgConnectionConfig,
  },
} as const;
`;
  }

  return `import { env, s } from '@tyravel/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
  connections: s.object({
    sqlite: s.object({
      driver: s.string({ enum: ['sqlite'] }),
      database: s.string({ required: true, minLength: 1 }),
    }),
  }),
});

export default {
  default: env('DB_CONNECTION', 'sqlite'),
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: env('DB_DATABASE', 'database/database.sqlite'),
    },
  },
} as const;
`;
}

export function queueConfig(options: NewProjectOptions): string {
  const redisBlock = options.redis
    ? `
    redis: {
      driver: 'redis',
      connection: 'default',
      retryAfter: 90,
    },`
    : '';

  return `import { env, s } from '@tyravel/config';

export const schema = s.object({
  default: s.string({ required: true, minLength: 1 }),
});

export default {
  default: env('QUEUE_CONNECTION', '${options.queue}'),
  connections: {
    database: {
      driver: 'database',
      table: 'jobs',
      connection: '${options.database}',
      retryAfter: 90,
    },${redisBlock}
  },
  failed: {
    table: 'failed_jobs',
  },
} as const;
`;
}

export function cacheConfig(options: NewProjectOptions): string {
  const redisBlock = options.redis
    ? `
    redis: {
      driver: 'redis',
      connection: 'default',
    },`
    : '';

  return `import type { CacheConfig } from '@tyravel/cache';
import { env } from '@tyravel/config';

export default {
  default: env('CACHE_STORE', 'file'),
  prefix: 'tyravel',
  connections: {
    file: {
      driver: 'file',
      path: 'storage/framework/cache',
    },
    array: { driver: 'array' },${redisBlock}
  },
} satisfies CacheConfig;
`;
}

export function envExample(name: string, options: NewProjectOptions): string {
  const dbLines =
    options.database === 'sqlite'
      ? `DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite`
      : `DB_CONNECTION=${options.database}
DB_HOST=127.0.0.1
DB_PORT=${options.database === 'postgres' ? '5432' : '3306'}
DB_DATABASE=tyravel
DB_USERNAME=${options.database === 'postgres' ? 'postgres' : 'root'}
DB_PASSWORD=`;

  const redisLines = options.redis
    ? `
REDIS_URL=
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0`
    : '';

  const cacheDefault = options.redis ? 'file' : 'file';

  return `# ${name} environment variables
APP_NAME=${name}
APP_DEBUG=true
APP_URL=http://127.0.0.1:3000
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en

${dbLines}

CACHE_STORE=${cacheDefault}
QUEUE_CONNECTION=${options.queue}${redisLines}

MAIL_MAILER=log
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME=Tyravel
# MAIL_HOST=127.0.0.1
# MAIL_PORT=587
# MAIL_USERNAME=
# MAIL_PASSWORD=
# MAIL_ENCRYPTION=tls

BROADCAST_CONNECTION=${options.redis ? 'websocket' : 'log'}
# BROADCAST_REDIS_CHANNEL=tyravel:broadcast

# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
# GITHUB_REDIRECT_URI=http://127.0.0.1:3000/auth/github/callback
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/auth/google/callback
`;
}