# Tyravel

**v0.1.0** — TypeScript-native web framework with Laravel-style ergonomics (service container, routing, middleware, queues, auth, and an Artisan-like CLI) on standard Web APIs.

Requires **Node.js ≥ 22**.

## Packages

| Package | Description |
|---------|-------------|
| `@tyravel/container` | IoC container with bindings, singletons, aliases, and callable injection |
| `@tyravel/http` | Router, route groups, middleware registry, request/response helpers |
| `@tyravel/config` | Typed config loading and dotted-key `ConfigRepository` |
| `@tyravel/validation` | Request validation with pipe rules and 422 error responses |
| `@tyravel/database` | Eloquent-style models, query builder, schema, and migrations |
| `@tyravel/views` | Blade-like `.tyr` templates with layouts, sections, and components |
| `@tyravel/queue` | Typed jobs, sync/database drivers, dispatch facade, and queue worker |
| `@tyravel/events` | Typed domain events, listeners, dispatcher, and `Events` facade |
| `@tyravel/core` | Application kernel, controllers, service providers, HTTP kernel, `Route` facade |
| `@tyravel/cli` | Project scaffolding, dev server, and code generators |
| `@tyravel/testing` | `TestCase`, HTTP test client, Vitest hooks, container fakes |
| `@tyravel/cache` | Array and file cache stores, `Cache` facade, `remember()` |
| `@tyravel/mail` | `Mailable` classes, log/array transports, `Mail` facade |
| `@tyravel/notifications` | Multi-channel notifications (mail, database), `Notifications` facade |

## Quick start

From the repository root:

```bash
npm install
npm run build
```

Create a new application:

```bash
npx tyravel new my-app
cd my-app
npm install
tyravel serve
```

Visit `http://127.0.0.1:3000`.

### Example app

The `examples/hello-world` app is also runnable from the monorepo:

```bash
cd examples/hello-world
npm install
tyravel serve
```

## CLI

```bash
tyravel list                         # List available commands
tyravel new <name> [--path=<dir>]    # Scaffold a new application
tyravel serve [--port=3000] [--host=127.0.0.1]
tyravel make:controller <Name>       # Create src/controllers/<Name>Controller.ts
tyravel make:provider <Name>           # Create src/providers/<Name>ServiceProvider.ts
tyravel make:model <Name>              # Create src/models/<Name>.ts
tyravel make:migration <name>            # Create database/migrations/<timestamp>_<name>.ts
tyravel make:view <name>                 # Create resources/views/<name>.tyr
tyravel make:job <Name>                  # Create src/jobs/<Name>.ts
tyravel make:event <Name>                # Create src/events/<Name>.ts
tyravel make:listener <Name>             # Create src/listeners/<Name>.ts
tyravel make:subscriber <Name>           # Create src/subscribers/<Name>.ts
tyravel queue:table                      # Migration for the jobs table
tyravel queue:failed-table               # Migration for failed_jobs
tyravel queue:work [--queue=default]     # Process database queue jobs
tyravel queue:failed                     # List failed jobs
tyravel queue:retry <id>                 # Re-queue a failed job
tyravel make:test <Name>                 # Create tests/feature/<name>.ts
tyravel auth:install                     # Scaffold session auth (User, routes, migrations)
tyravel migrate                        # Run pending migrations
tyravel version                      # Show CLI version
```

New projects include a `tyravel.json` config file:

```json
{
  "name": "my-app",
  "entry": "src/main.ts",
  "serve": {
    "port": 3000,
    "hostname": "127.0.0.1"
  }
}
```

`tyravel serve` reads this config and passes `TYRAVEL_PORT` / `TYRAVEL_HOST` to the app. Bun is the recommended runtime; Node 22+ is also supported natively via the built-in HTTP adapter.

## Application structure

```
my-app/
├── tyravel.json
├── package.json
├── config/
│   └── app.ts
└── src/
    ├── main.ts
    ├── routes/
    │   └── web.ts
    ├── providers/
    │   └── app-service-provider.ts
    └── controllers/
```

### Routes

```typescript
import { Route } from '@tyravel/core';
import { Response } from '@tyravel/http';
import { UserController } from '../controllers/user-controller.js';

Route.get('/', (request) =>
  Response.json({ message: 'Welcome to Tyravel', path: request.path }),
);

Route.prefix('api')
  .middleware('auth')
  .group(() => {
    Route.get('/users', [UserController, 'index']);
    Route.get('/users/:id', [UserController, 'show']).name('users.show');
  });
```

### Controllers

```typescript
Route.get('/users', [UserController, 'index']);
```

Controller classes are resolved through the service container, so constructor dependencies are injected automatically when bound.

### Middleware aliases

```typescript
app.middleware('auth', async (request, next) => {
  if (!request.bearerToken()) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return next();
});

Route.middleware('auth').get('/profile', handler);
```

### Config

`ConfigServiceProvider` loads `.env` from the application root before importing `config/*.ts`. Use `env()` in config files:

```typescript
// .env
APP_NAME=Tyravel
APP_DEBUG=true

// config/app.ts
import { env } from '@tyravel/config';

export default {
  name: env('APP_NAME', 'Tyravel'),
  debug: env('APP_DEBUG', true),
} as const;

// src/main.ts
app.register(ConfigServiceProvider);
const name = app.make<ConfigRepository>('config').get<string>('app.name');
```

New apps scaffold `.env` and `.env.example`. Existing shell variables are not overwritten unless you pass `{ override: true }` to `loadEnv()`.

### Validation

```typescript
import { validateRequest } from '@tyravel/validation';

const data = await validateRequest(request, {
  email: 'required|email',
  age: 'required|integer|min:18',
});
```

Invalid requests return HTTP 422 with a structured `errors` object.

### Database / ORM

```typescript
import { Model } from '@tyravel/database';
import type { ModelQueryBuilder } from '@tyravel/database';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
}

export class User extends Model<UserAttributes> {
  static override table = 'users';

  static scopeActive(builder: ModelQueryBuilder): ModelQueryBuilder {
    return builder.where('active', 1);
  }
}

const users = await User.all();
const active = await User.scope('active').getModels();
const user = await User.find(1);
const created = await User.create({ name: 'Ada', email: 'ada@example.com' });
await user.update({ name: 'Grace' });
await user.delete();

// Relationships
const posts = await user.hasMany(Post).get();
const post = await user.hasOne(Post).get();
const author = await post.belongsTo(User).get();
const roles = await user.belongsToMany(Role).get();
```

Register `DatabaseServiceProvider`, add `config/database.ts`, then run migrations:

```bash
tyravel migrate
```

`config/database.ts` supports SQLite, PostgreSQL, and MySQL:

```typescript
export default {
  default: 'sqlite',
  connections: {
    sqlite: { driver: 'sqlite', database: 'database/database.sqlite' },
    postgres: {
      driver: 'postgres',
      host: '127.0.0.1',
      database: 'tyravel',
      username: 'postgres',
      password: '',
    },
    mysql: {
      driver: 'mysql',
      host: '127.0.0.1',
      database: 'tyravel',
      username: 'root',
      password: '',
    },
  },
} as const;
```

Migrations live in `database/migrations/` and use a fluent schema builder:

```typescript
await schema.create('users', (table) => {
  table.id();
  table.string('email');
  table.timestamps();
});
```

**Drivers:** SQLite (Node 22.5+ via `node:sqlite`), PostgreSQL (`pg`), and MySQL (`mysql2`).

**Query scopes:** define `scopeName(builder, ...args)` on a model and call `Model.scope('name', ...args)`. Global scopes use `Model.addGlobalScope((builder) => ...)`.

### Views / Templating

Register `ViewServiceProvider`, add `config/views.ts`, and place templates in `resources/views/`:

```typescript
import { View, ViewServiceProvider, setViewApplication } from '@tyravel/core';
import { Response } from '@tyravel/http';

setViewApplication(app);
app.register(ViewServiceProvider);

Route.get('/', async () =>
  Response.html(await View.render('welcome', { name: 'Ada' })),
);
```

`.tyr` templates support Blade-like directives:

```html
@layout('layouts.app')

@section('title')
  Dashboard
@endsection

@section('content')
  <h1>Hello {{ name }}</h1>
  @if (users.length)
    @foreach (users as user)
      <p>{{ user.name }}</p>
    @endforeach
  @endif
  @component('components.alert', { message: 'Welcome' })
@endsection
```

Layouts use `@yield('section')`. Values in `{{ }}` are HTML-escaped; use `{!! html !!}` for raw output. Generate views with `tyravel make:view pages.about`.

### Queue / Jobs

Register `QueueServiceProvider`, add `config/queue.ts`, and register job classes on the `JobRegistry` in `AppServiceProvider`:

```typescript
import { JobRegistry } from '@tyravel/queue';
import { SendWelcomeEmail } from '../jobs/send-welcome-email.js';

this.app.make<JobRegistry>('jobs.registry').register(SendWelcomeEmail);
```

Dispatch from routes or services:

```typescript
import { dispatch, Queue } from '@tyravel/core';
import { SendWelcomeEmail } from '../jobs/send-welcome-email.js';

await dispatch(new SendWelcomeEmail({ email: 'ada@example.com' }));

await Queue.connection('database').dispatch(
  new SendWelcomeEmail({ email: 'grace@example.com' }),
  'emails',
);

await Queue.later(60, new SendWelcomeEmail({ email: 'later@example.com' }));
```

Typed job classes:

```typescript
import { Job } from '@tyravel/queue';

export interface SendWelcomeEmailPayload {
  email: string;
}

export class SendWelcomeEmail extends Job<SendWelcomeEmailPayload> {
  override async handle(): Promise<void> {
    // send mail using this.data.email
  }
}
```

For the database driver, create the jobs table and run a worker:

```bash
tyravel queue:table
tyravel migrate
tyravel queue:work --connection=database --queue=default
```

Jobs that exhaust retries are written to `failed_jobs` (when the table exists and `queue.failed` is configured). Inspect and retry:

```bash
tyravel queue:failed-table
tyravel migrate
tyravel queue:failed
tyravel queue:retry 1
```

`config/queue.ts` supports `sync` (immediate, great for local dev) and `database` (persistent, worker-driven):

```typescript
export default {
  default: 'sync',
  connections: {
    sync: { driver: 'sync' },
    database: {
      driver: 'database',
      table: 'jobs',
      connection: 'sqlite',
      retryAfter: 90,
    },
  },
} as const;
```

### Events

Register `EventServiceProvider` and map listeners in `config/events.ts` (typed class references) or at runtime:

```typescript
import { UserRegistered } from '../events/user-registered.js';
import { SendWelcomeEmail } from '../listeners/send-welcome-email.js';

export default {
  listen: [
    [UserRegistered, [SendWelcomeEmail]],
  ],
} satisfies import('@tyravel/events').EventsConfig;
```

Dispatch from routes, jobs, or services:

```typescript
import { Events, fire } from '@tyravel/core';
import { UserRegistered } from '../events/user-registered.js';

await fire(new UserRegistered({ userId: 1 }));

Events.listen(UserRegistered, async (event) => {
  console.log(event.data.userId);
});

await Events.dispatch(new UserRegistered({ userId: 2 }));
```

Typed event and listener classes:

```typescript
import { Event, Listener } from '@tyravel/events';

export interface UserRegisteredPayload {
  userId: number;
}

export class UserRegistered extends Event<UserRegisteredPayload> {}

export class SendWelcomeEmail extends Listener<UserRegistered> {
  override async handle(event: UserRegistered): Promise<void> {
    // event.data.userId
  }
}
```

Listeners resolve from the container when registered as classes, so constructor dependencies work like controllers.

**Event subscribers** group listener registration in one class (Laravel-style):

```typescript
import { EventSubscriber } from '@tyravel/events';
import type { EventDispatcher } from '@tyravel/events';

export class AuthEventSubscriber extends EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen(UserRegistered, SendWelcomeEmail);
  }
}
```

Register in `config/events.ts`:

```typescript
import { AuthEventSubscriber } from '../src/subscribers/auth-event-subscriber.js';

export default {
  listen: [],
  subscribers: [AuthEventSubscriber],
} satisfies import('@tyravel/events').EventsConfig;
```

**Queued listeners** extend `QueuedListener` (Laravel's `ShouldQueue`). They are serialized to a `CallQueuedListener` job instead of running inline:

```typescript
import { QueuedListener } from '@tyravel/events';

export class SendInvoiceEmail extends QueuedListener<InvoicePaid> {
  static connection = 'database';
  static queue = 'emails';
  static delaySeconds = 30;

  override async handle(event: InvoicePaid): Promise<void> {
    //
  }
}
```

Set defaults in `config/events.ts`:

```typescript
export default {
  listen: [[InvoicePaid, [SendInvoiceEmail]]],
  queueConnection: 'database',
  queue: 'default',
} satisfies import('@tyravel/events').EventsConfig;
```

Register `QueueServiceProvider` **before** `EventServiceProvider`, run `tyravel queue:work`, and queued listeners execute on the worker.

### Authentication

Session-based **web guard** plus **API token guard** (`auth:api`), policies, password reset, and OAuth (GitHub + Google):

```bash
tyravel auth:install
tyravel migrate
```

Register facades in `main.ts`: `setAuthApplication`, `setGateApplication`, `setPasswordApplication`.

`AuthServiceProvider` registers **StartSession**, **`auth`**, **`auth:api`**, and **`guest`** middleware.

```typescript
import { Auth, Gate, Password } from '@tyravel/core';

await Auth.attempt({ email, password });
const token = await Auth.createToken('mobile', ['*']);
await Password.sendResetLink(email);
await Gate.authorize(Auth.user(), 'update', post);
```

| Feature | Notes |
|---------|--------|
| **Policies** | Map models in `config/auth.ts` `policies`; `Gate.authorize(user, ability, model)` |
| **Password reset** | `password_reset_tokens` table; `Password.sendResetLink` / `Password.reset` |
| **API tokens** | `personal_access_tokens`; `Authorization: Bearer <token>` on `api` guard |
| **OAuth** | `GET /auth/:provider/redirect` and `/callback`; env `GITHUB_*` / `GOOGLE_*` |

Routes from `auth:install` include login, tokens, forgot/reset password, and OAuth redirects.

### Testing

`@tyravel/testing` brings Laravel-style feature tests on top of Vitest:

```bash
npm test                    # in an app created with tyravel new
tyravel make:test Posts     # tests/feature/posts.test.ts
```

```typescript
import { Application } from '@tyravel/core';
import { TestCase, withTyravelTest, fake, mockInstance } from '@tyravel/testing';

class AppTest extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir);
  }
  protected override async configureApplication(app) {
    // import routes, register providers, wireFacades via setUp()
  }
}

const t = withTyravelTest(AppTest);

it('returns JSON', async () => {
  const res = await t.http.post('http://localhost/login', {
    json: { email: 'a@b.com', password: 'secret' },
  });
  await res.assertOk().assertJson({ user: { email: 'a@b.com' } });
});
```

| API | Purpose |
|-----|---------|
| **`HttpTestClient`** | `get` / `post` / … through `HttpKernel` with cookie jar + `withToken()` |
| **`TestResponse`** | `assertStatus`, `assertJson` (partial), `assertJsonPath` |
| **`fake` / `mockInstance`** | Swap container bindings for test doubles |
| **`wireFacades`** | Point `Route`, `Auth`, `Gate`, etc. at the test app |

New apps get `vitest.config.ts`, `tests/feature/example.test.ts`, and `@tyravel/testing` as a dev dependency.

### Cache, mail, and notifications

New projects ship `config/cache.ts`, `config/mail.ts`, and `config/notifications.ts`, with providers registered in `src/main.ts`.

```typescript
import { Cache, Mail, Notifications, Mailable, Notification } from '@tyravel/core';

await Cache.remember('stats', 300, async () => computeStats());
await Mail.to('user@example.com').send(new WelcomeMail());
await Notifications.send(user, new InvoicePaidNotification());
```

| Facade | Drivers / channels |
|--------|-------------------|
| `Cache` | `array`, `file` (`storage/framework/cache`) |
| `Mail` | `log`, `array` (tests), **`smtp`**; **`shouldQueue()`** → `SendMailable` job |
| `Notifications` | `mail`, `database`; **`shouldQueue()`** → `SendQueuedNotification` (default **`database`** queue) |

Use the **array** mail connection in tests to assert `mail.transport('array').messages`.

**SMTP** (`config/mail.ts` → `smtp` connection): set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, then `default: 'smtp'`.

**Queued mailables**: override `shouldQueue()` on your `Mailable`; Tyravel serializes the built message into `SendMailable` (`mail.queueConnection` / `queue` in config, default **`database`**).

**Queued notifications**: override `shouldQueue()` on your `Notification` class; Tyravel pushes `SendQueuedNotification` via the app queue (`notifications.queueConnection` / `queue` — default **`database`**). Run `tyravel queue:work` to process the `jobs` table.

New apps scaffold `jobs`, `failed_jobs`, and `notifications` migrations and set `config/queue.ts` default to **`database`**.

### Service providers

```typescript
import { ServiceProvider } from '@tyravel/core';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('app.name', 'Tyravel');
  }
}
```

## Development

```bash
npm test          # Run all package tests (78 tests)
npm run build     # Build all packages
npm run typecheck # Type-check via project references
```

## Publishing (`@tyravel/*` v0.1.0)

From the monorepo root after `npm run build`:

```bash
# Publish in dependency order (container → … → core → cli)
npm publish -w @tyravel/container --access public
# … repeat for each package, or use your preferred release script
npm publish -w @tyravel/cli --access public
```

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Roadmap

**v0.1.0** ships the full stack below. Future releases will focus on polish, adapters, and ecosystem packages on npm.

### Shipped in v0.1.0

- [x] Service container, HTTP router, kernel, `Route` facade, CLI scaffolding
- [x] Route groups, controllers, config, middleware registry, validation, Node `serve()`
- [x] Eloquent-style ORM, views, queue/events, auth (session, tokens, OAuth, policies)
- [x] `@tyravel/testing`, cache, mail (SMTP + queued mailables), notifications (queued, database queue default)

## License

MIT