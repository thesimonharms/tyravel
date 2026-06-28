import type { NewProjectOptions } from './new-project-options.js';

const CORE_VERSION = '^1.0.1';

export function headlessProjectConfig(name: string): string {
  return JSON.stringify(
    {
      name,
      mode: 'headless',
      entry: 'src/main.ts',
      serve: {
        port: 3000,
        hostname: '127.0.0.1',
      },
    },
    null,
    2,
  );
}

export function headlessAppConfig(name: string): string {
  return `import { env, s } from '@tyravel/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
  headless: s.boolean(),
  debug: s.boolean(),
  url: s.string({ url: true }),
});

export default {
  name: env('APP_NAME', '${name}'),
  headless: true,
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
  locale: env('APP_LOCALE', 'en'),
  fallback_locale: env('APP_FALLBACK_LOCALE', 'en'),
  faker_locale: env('APP_FAKER_LOCALE', 'en'),
} as const;
`;
}

export function headlessHttpConfig(): string {
  return `import type { HttpConfig } from '@tyravel/core';

export default {
  trustedProxies: ['127.0.0.1', '::1'],
  throttle: {
    enabled: true,
    limit: 120,
    windowMs: 60_000,
    limits: {
      api: { limit: 120, windowMs: 60_000 },
    },
  },
} satisfies HttpConfig;
`;
}

export function headlessApiRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { Response } from '@tyravel/http';

Route.get('/', () =>
  Response.json({
    mode: 'headless',
    message: 'Tyravel API — routes live under /api/v1',
    docs: 'https://tyravel.dev/guide/headless',
  }),
);

Route.prefix('api/v1').middleware('throttle:api').group((routes) => {
  routes.get('/health', () => Response.json({ status: 'ok' }));
  routes.get('/posts', () => Response.json({ data: [] }));
  routes.post('/posts', () => Response.json({ data: { id: 1 } }, { status: 201 }));
});
`;
}

export function headlessPackageJson(name: string, options: NewProjectOptions): string {
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

export function headlessMainEntry(options: NewProjectOptions): string {
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
  }

  const coreImports = [
    'Application',
    'CacheServiceProvider',
    'ConfigRepository',
    'ConfigServiceProvider',
    'DatabaseServiceProvider',
    ...(options.redis ? ['RedisServiceProvider'] : []),
    'EventServiceProvider',
    'HttpKernel',
    'LogServiceProvider',
    'MailServiceProvider',
    'NotificationServiceProvider',
    'QueueServiceProvider',
    'StorageServiceProvider',
    'prepareHttpServer',
    'setCacheApplication',
    'setEventApplication',
    'setLogApplication',
    'setMailApplication',
    'setNotificationApplication',
    'setQueueApplication',
    'setRouteApplication',
    'setStorageApplication',
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
    'app.register(AppServiceProvider);',
  ];

  return `${driverImports.length > 0 ? `${driverImports.join('\n')}\n` : ''}import {
  ${coreImports.join(',\n  ')},
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/api.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setQueueApplication(app);
setEventApplication(app);
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

export function headlessAuthConfig(): string {
  return `import type { AuthConfig } from '@tyravel/auth';
import { env } from '@tyravel/config';
import { User } from '../src/models/User.js';

export default {
  defaults: {
    guard: 'api',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },
    api: {
      driver: 'token',
      provider: 'users',
    },
  },
  providers: {
    users: {
      driver: 'eloquent',
      model: User,
    },
  },
  session: {
    driver: 'database',
    cookie: 'tyravel_session',
    lifetimeMinutes: 120,
    secure: env('SESSION_SECURE', 'false') === 'true',
    table: 'sessions',
    connection: 'sqlite',
  },
  passwords: {
    users: {
      provider: 'users',
      table: 'password_reset_tokens',
      expireMinutes: 60,
      connection: 'sqlite',
    },
  },
  tokens: {
    table: 'personal_access_tokens',
    connection: 'sqlite',
    prefix: 'tyr_',
    prefixLength: 8,
  },
  oauth: {
    accountsTable: 'oauth_accounts',
    connection: 'sqlite',
    providers: {
      github: {
        clientId: env('GITHUB_CLIENT_ID', ''),
        clientSecret: env('GITHUB_CLIENT_SECRET', ''),
        redirectUri: env('GITHUB_REDIRECT_URI', 'http://127.0.0.1:3000/api/v1/auth/github/callback'),
        scopes: ['user:email'],
      },
    },
  },
} satisfies AuthConfig;
`;
}

export function headlessAuthRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { AuthController } from '../controllers/AuthController.js';

Route.prefix('api/v1').middleware('throttle:api').group((routes) => {
  routes.middleware('guest').post('/login', [AuthController, 'login']);
  routes.middleware('guest').post('/forgot-password', [AuthController, 'forgotPassword']);
  routes.middleware('guest').post('/reset-password', [AuthController, 'resetPassword']);
  routes.middleware('auth:api').get('/me', [AuthController, 'me']);
  routes.middleware('auth:api').post('/logout', [AuthController, 'logout']);
  routes.middleware('auth:api').post('/tokens', [AuthController, 'createToken']);
  routes.middleware('auth:api').delete('/tokens/:id', [AuthController, 'revokeToken']);
  routes.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
  routes.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
});
`;
}

export function headlessMainEntryWithAuth(options: NewProjectOptions): string {
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
  }

  const coreImports = [
    'Application',
    'AuthServiceProvider',
    'CacheServiceProvider',
    'ConfigRepository',
    'ConfigServiceProvider',
    'DatabaseServiceProvider',
    ...(options.redis ? ['RedisServiceProvider'] : []),
    'EventServiceProvider',
    'HttpKernel',
    'LogServiceProvider',
    'MailServiceProvider',
    'NotificationServiceProvider',
    'QueueServiceProvider',
    'StorageServiceProvider',
    'prepareHttpServer',
    'setAuthApplication',
    'setCacheApplication',
    'setEventApplication',
    'setGateApplication',
    'setLogApplication',
    'setMailApplication',
    'setNotificationApplication',
    'setPasswordApplication',
    'setQueueApplication',
    'setRouteApplication',
    'setStorageApplication',
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
    'app.register(AuthServiceProvider);',
    'app.register(AppServiceProvider);',
  ];

  return `${driverImports.length > 0 ? `${driverImports.join('\n')}\n` : ''}import {
  ${coreImports.join(',\n  ')},
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/api.js';
import './routes/auth.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setQueueApplication(app);
setEventApplication(app);
setCacheApplication(app);
setStorageApplication(app);
setLogApplication(app);
setMailApplication(app);
setNotificationApplication(app);
setAuthApplication(app);
setGateApplication(app);
setPasswordApplication(app);

${providerRegistrations.join('\n')}

await app.boot();

await prepareHttpServer(app, app.make(ConfigRepository));

const kernel = new HttpKernel(app);
await serve(kernel);
`;
}

export function headlessFeatureTestStub(className: string): string {
  return `import { describe, expect, it } from 'vitest';
import { Application, ConfigServiceProvider, DatabaseServiceProvider, setRouteApplication } from '@tyravel/core';
import { TestCase, withTyravelTest } from '@tyravel/testing';

class ${className} extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir + '/..');
  }

  protected override providers() {
    return [ConfigServiceProvider, DatabaseServiceProvider];
  }

  protected override async configureApplication(app: Application): Promise<void> {
    process.env.DB_DATABASE = ':memory:';
    setRouteApplication(app);
    await import('../src/routes/api.js');
    await super.configureApplication(app);
  }
}

const t = withTyravelTest(${className});

describe('headless API', () => {
  it('returns the headless index payload', async () => {
    const response = await t.http.get('http://localhost/');
    await response.assertOk();
    await response.assertJson({ mode: 'headless' });
  });

  it('serves versioned API health', async () => {
    const response = await t.http.get('http://localhost/api/v1/health');
    await response.assertOk();
    await response.assertJson({ status: 'ok' });
  });
});
`;
}

export function headlessReadme(name: string): string {
  return `# ${name}

Headless Tyravel API — backend only, no views, SSR, or client assets.

## Quick start

\`\`\`bash
tyravel migrate
tyravel dev
curl http://127.0.0.1:3000/api/v1/health
\`\`\`

## Layout

- \`src/routes/api.ts\` — versioned JSON routes (\`/api/v1/*\`)
- \`config/app.ts\` — \`headless: true\` enables headless-aware tooling
- \`tyravel.json\` — \`"mode": "headless"\`

## Auth

Run \`tyravel auth:install\` for API token and session guards. Headless apps default to JSON responses — no Blade-style views.

## Docs

https://tyravel.dev/guide/headless
`;
}