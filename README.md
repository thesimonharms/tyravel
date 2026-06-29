<p align="center">
  <a href="https://pondoknusa.dev"><img src="logo.svg" alt="Pondoknusa" width="96" height="96" /></a>
</p>

<h1 align="center">Pondoknusa</h1>

<p align="center">
  <strong>v2.0.0</strong> — TypeScript-native full-stack web framework (service container, routing, middleware, queues, auth, post-quantum crypto, and a first-class CLI) on standard Web APIs.
</p>

<p align="center">
  <a href="https://github.com/pondoknusa/pondoknusa">GitHub</a> ·
  <a href="https://www.npmjs.com/org/pondoknusa">npm</a> ·
  <a href="https://pondoknusa.dev">Docs</a>
</p>

<p align="center">
  Requires <strong>Node.js ≥ 26</strong> — native SQLite (<code>node:sqlite</code>), WebSocket server/client framing, and OpenSSL post-quantum crypto with no JavaScript fallbacks.
</p>

## Lean by default

A vanilla `pondoknusa new` app is almost entirely `@pondoknusa/*` packages. The default scaffold uses **SQLite** (no extra driver), **database queues**, and **log mail** — no Redis, no cloud SDKs, no realtime client libraries.

| What you add | Optional driver package | Third-party npm dep |
|--------------|-------------------------|---------------------|
| PostgreSQL | `@pondoknusa/database-pg` | `pg` |
| MySQL | `@pondoknusa/database-mysql` | `mysql2` |
| Redis (cache, queue, broadcast) | `@pondoknusa/redis-node` | `redis` |
| S3 / R2 storage | `@pondoknusa/storage-aws-s3` | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |

That is the full set of external production dependencies across the Pondoknusa monorepo. Real-time broadcasting uses a **native WebSocket** hub (`@pondoknusa/broadcasting-websocket`) and browser `WebSocket` via `@pondoknusa/echo` — no `socket.io-client`, no `pusher-js`, no separate socket server to run.

## API stability

Published `@pondoknusa/*` packages follow the semver and deprecation rules in [STABILITY.md](STABILITY.md). Patch releases preserve documented stable APIs; experimental features (programmatic `.tyr.ts` views, REPL, etc.) may change in minors. See [Upgrading to 1.0](docs/guide/upgrading-to-1.0.md) when moving from 0.x.

## Packages

| Package | Description |
|---------|-------------|
| `@pondoknusa/container` | IoC container with bindings, singletons, aliases, and callable injection |
| `@pondoknusa/support` | String helpers (`Str.slug`, `camelCase`, `snakeCase`, `random`, etc.) |
| `@pondoknusa/http` | Router, middleware, request/response helpers, API resources (`JsonResource`) |
| `@pondoknusa/config` | Typed config loading and dotted-key `ConfigRepository` |
| `@pondoknusa/validation` | Request validation with pipe rules and 422 error responses |
| `@pondoknusa/database` | Eloquent-style models, query builder, schema, and migrations |
| `@pondoknusa/views` | Blade-like `.tyr` templates with layouts, sections, components, and SSR directives |
| `@pondoknusa/ssr` | Client hydration runtime for `@island` partials (`registerIsland`, `hydrate`) |
| `@pondoknusa/echo` | Laravel Echo-style browser client (native `WebSocket`, zero peer dependencies) |
| `@pondoknusa/broadcasting-websocket` | Native WebSocket broadcast hub and Redis fan-out driver |
| `@pondoknusa/queue` | Typed jobs, database/redis drivers, dispatch facade, and queue worker |
| `@pondoknusa/events` | Typed domain events, listeners, dispatcher, and `Events` facade |
| `@pondoknusa/core` | Application kernel, controllers, service providers, HTTP kernel, `Route` facade |
| `@pondoknusa/cli` | Project scaffolding, dev server, and code generators |
| `@pondoknusa/testing` | `TestCase`, HTTP test client, Vitest hooks, container fakes |
| `@pondoknusa/redis` | Redis connection manager for cache and queue drivers |
| `@pondoknusa/cache` | Array, file, and Redis cache stores, `Cache` facade, `remember()` |
| `@pondoknusa/mail` | `Mailable` classes, log/array transports, `Mail` facade |
| `@pondoknusa/notifications` | Multi-channel notifications (mail, database), `Notifications` facade |
| `@pondoknusa/auth` | Session and token guards, social OAuth, CSRF, policies, password reset |
| `@pondoknusa/auth-oauth` | OAuth2 authorization server (authorization code, client credentials, refresh) |
| `@pondoknusa/crypto` | Post-quantum KEM/signatures, session encryption, signed OAuth tokens |
| `@pondoknusa/broadcasting` | Real-time event broadcasting, channel auth, and Echo client config |
| `@pondoknusa/storage` | File storage with local, S3, R2, and Supabase adapters |

## Quick start

From the repository root:

```bash
npm install
npm run build
```

Create a new application:

```bash
npm create pondoknusa@latest my-app
cd my-app
npm install
pondoknusa serve
```

Visit `http://127.0.0.1:3000`.

### Example app

The `examples/hello-world` app is also runnable from the monorepo:

```bash
cd examples/hello-world
npm install
pondoknusa serve
```

## CLI

```bash
pondoknusa list                         # List available commands
pondoknusa new <name> [--path=<dir>]    # Scaffold a new application
pondoknusa serve [--port=3000] [--host=127.0.0.1]
pondoknusa make:controller <Name>       # Create src/controllers/<Name>Controller.ts
pondoknusa make:request <Name>          # Create src/requests/<Name>Request.ts
pondoknusa make:resource <Name>         # Create src/resources/<Name>Resource.ts
pondoknusa make:provider <Name>           # Create src/providers/<Name>ServiceProvider.ts
pondoknusa make:model <Name>              # Create src/models/<Name>.ts
pondoknusa make:factory <Model>             # Create database/factories/<model>-factory.ts
pondoknusa make:seeder <Name>               # Create database/seeders/<name>-seeder.ts
pondoknusa make:migration <name>            # Create database/migrations/<timestamp>_<name>.ts
pondoknusa make:view <name>                 # Create resources/views/<name>.tyr
pondoknusa make:island <name>                # Scaffold island view + client mount
pondoknusa make:job <Name>                  # Create src/jobs/<Name>.ts
pondoknusa make:event <Name>                # Create src/events/<Name>.ts
pondoknusa make:listener <Name>             # Create src/listeners/<Name>.ts
pondoknusa make:subscriber <Name>           # Create src/subscribers/<Name>.ts
pondoknusa queue:table                      # Migration for the jobs table
pondoknusa queue:failed-table               # Migration for failed_jobs
pondoknusa queue:work [--queue=default]     # Process database queue jobs
pondoknusa queue:failed                     # List failed jobs
pondoknusa queue:retry <id>                 # Re-queue a failed job
pondoknusa make:test <Name>                 # Create tests/feature/<name>.ts
pondoknusa auth:install                     # Scaffold session auth (User, routes, migrations)
pondoknusa oauth:install                    # Scaffold OAuth2 authorization server
pondoknusa oauth:client:create <name> --redirect=<uri>  # Register an OAuth2 client
pondoknusa crypto:install                   # Scaffold config/crypto.ts
pondoknusa crypto:generate-keys [--algorithm=ml-dsa-65] # Generate post-quantum key material
pondoknusa make:social-driver <name>        # Scaffold a custom social OAuth provider
pondoknusa migrate                        # Run pending migrations
pondoknusa db:seed [--class=DatabaseSeeder]  # Seed the database
pondoknusa version                      # Show CLI version
```

New projects include a `pondoknusa.json` config file:

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

`pondoknusa serve` reads this config and passes `PONDOKNUSA_PORT` / `PONDOKNUSA_HOST` to the app. Bun is the recommended runtime; Node 26+ is also supported natively via the built-in HTTP adapter.

## Application structure

```
my-app/
├── pondoknusa.json
├── package.json
├── config/
│   ├── app.ts
│   ├── auth.ts          # after pondoknusa auth:install
│   ├── crypto.ts        # optional — session encryption, OAuth signing
│   └── oauthServer.ts   # after pondoknusa oauth:install
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
import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { UserController } from '../controllers/user-controller.js';

Route.get('/', (request) =>
  Response.json({ message: 'Welcome to Pondoknusa', path: request.path }),
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
APP_NAME=Pondoknusa
APP_DEBUG=true

// config/app.ts
import { env } from '@pondoknusa/config';

export default {
  name: env('APP_NAME', 'Pondoknusa'),
  debug: env('APP_DEBUG', true),
} as const;

// src/main.ts
app.register(ConfigServiceProvider);
const name = app.make<ConfigRepository>('config').get<string>('app.name');
```

New apps scaffold `.env` and `.env.example`. Existing shell variables are not overwritten unless you pass `{ override: true }` to `loadEnv()`.

### String helpers

Laravel-style string utilities live in `@pondoknusa/support`:

```typescript
import { Str, slug } from '@pondoknusa/support';

slug('  My Post Title!  '); // "my-post-title"
Str.camel('foo_bar');        // "fooBar"
Str.snake('FooBar');         // "foo_bar"
Str.studly('foo-bar');       // "FooBar"
Str.kebab('FooBarBaz');      // "foo-bar-baz"
Str.random(32);              // alphanumeric token
```

### Validation

```typescript
import { validateRequest } from '@pondoknusa/validation';

const data = await validateRequest(request, {
  email: 'required|email',
  age: 'required|integer|min:18',
});
```

Invalid requests return HTTP 422 with a structured `errors` object.

### Form requests

Form requests combine validation and authorization for controller actions:

```typescript
import { FormRequest } from '@pondoknusa/core';
import { Gate } from '@pondoknusa/core';

export class StoreUserRequest extends FormRequest<{ email: string; name: string }> {
  async authorize(): Promise<boolean> {
    return this.authorizePolicy('create', User);
  }

  rules() {
    return {
      email: ['required', 'email'],
      name: ['required', 'min_length:2'],
    };
  }
}
```

Wire a form request into a route by passing it as the third element of a controller tuple:

```typescript
Route.post('/users', [UserController, 'store', StoreUserRequest]);
```

The controller receives the validated form request as its first argument (or as the second argument when the action also needs the raw `PondoknusaRequest`):

```typescript
store(form: StoreUserRequest) {
  const { email, name } = form.validated();
  // ...
}
```

Generate a scaffold with `pondoknusa make:request StoreUser`.

### API resources

Transform models and paginated results into consistent JSON API responses:

```typescript
import { JsonResource } from '@pondoknusa/http';
import type { PondoknusaRequest } from '@pondoknusa/http';

export class UserResource extends JsonResource<User> {
  toArray(_request?: PondoknusaRequest) {
    return {
      id: this.resource.getAttribute('id'),
      name: this.resource.getAttribute('name'),
      email: this.resource.getAttribute('email'),
    };
  }
}

// Single resource — wrapped in { data: ... } by default
return UserResource.make(user);

// Collection
return UserResource.collection(users);

// Paginated collection — preserves pagination metadata
const page = await User.query().orderBy('id').paginateModels(request.perPage(), request.page());
return UserResource.collection(page);
```

Set `static wrap = null` on a resource class to disable the default `data` envelope. Generate a scaffold with `pondoknusa make:resource User`.

### Database / ORM

```typescript
import { Model } from '@pondoknusa/database';
import type { ModelQueryBuilder } from '@pondoknusa/database';

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
pondoknusa migrate
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
      database: 'pondoknusa',
      username: 'postgres',
      password: '',
    },
    mysql: {
      driver: 'mysql',
      host: '127.0.0.1',
      database: 'pondoknusa',
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

Packages can contribute migrations via `ServiceProvider.loadMigrationsFrom()`. Register the package provider from `AppServiceProvider` so `pondoknusa migrate` picks them up:

```typescript
import { join } from 'node:path';
import { ServiceProvider } from '@pondoknusa/core';

export class LontarServiceProvider extends ServiceProvider {
  override register() {
    this.loadMigrationsFrom(join(import.meta.dirname, 'database/migrations'));
  }
}

// AppServiceProvider.register()
this.app.register(LontarServiceProvider);
```

`pondoknusa migrate` boots `AppServiceProvider` and runs all registered migration paths in filename order.

**Drivers:** SQLite (Node 26+ via `node:sqlite`), PostgreSQL (`pg`), and MySQL (`mysql2`).

**Query scopes:** define `scopeName(builder, ...args)` on a model and call `Model.scope('name', ...args)`. Global scopes use `Model.addGlobalScope((builder) => ...)`.

**Computed attributes:** whitelist accessors for JSON serialization with `static appends`, Laravel-style. Use either a class getter or a `getRenderedBodyAttribute()` method for `rendered_body`:

```typescript
export class Post extends Model<PostAttributes> {
  static override appends = ['rendered_body'];

  get rendered_body(): string {
    return markdownToHtml(this.getAttribute('body') ?? '');
  }
}

post.toJSON(); // includes body + rendered_body
```

Loaded relations can be appended too: `post.append('author')` or `static appends = ['author']`.

**Pagination:** paginate query builder or model results with total counts and page metadata:

```typescript
import { LengthAwarePaginator } from '@pondoknusa/database';

// From a model (shorthand)
const page = await User.paginate(15, 2);

// From a model query
const users = await User.query().orderBy('id').paginateModels(15, 2);

// From a low-level query builder
const rows = await new QueryBuilder(connection, 'users').orderBy('id').paginate(10);

// In a controller — read ?page= and ?per_page= from the request
const users = await User.query()
  .orderBy('id')
  .paginate(request.perPage(), request.page());

return Response.json(users.toArray());
```

`LengthAwarePaginator#toArray()` returns `{ data, currentPage, perPage, total, lastPage, from, to }` for JSON APIs.

### Views / Templating

Register `ViewServiceProvider`, add `config/views.ts`, and place templates in `resources/views/`:

```typescript
import { View, ViewServiceProvider, setViewApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

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

Layouts use `@yield('section')`. Values in `{{ }}` are HTML-escaped; use `{!! html !!}` for raw output. Generate views with `pondoknusa make:view pages.about`.

### Queue / Jobs

Register `QueueServiceProvider`, add `config/queue.ts`, and register job classes on the `JobRegistry` in `AppServiceProvider`:

```typescript
import { JobRegistry } from '@pondoknusa/queue';
import { SendWelcomeEmail } from '../jobs/send-welcome-email.js';

this.app.make<JobRegistry>('jobs.registry').register(SendWelcomeEmail);
```

Dispatch from routes or services:

```typescript
import { dispatch, Queue } from '@pondoknusa/core';
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
import { Job } from '@pondoknusa/queue';

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
pondoknusa queue:table
pondoknusa migrate
pondoknusa queue:work --connection=database --queue=default
```

Jobs that exhaust retries are written to `failed_jobs` (when the table exists and `queue.failed` is configured). Inspect and retry:

```bash
pondoknusa queue:failed-table
pondoknusa migrate
pondoknusa queue:failed
pondoknusa queue:retry 1
```

`config/queue.ts` defaults to `database` (persistent, worker-driven). Use `redis` for production-grade external queues. New apps scaffold `QUEUE_CONNECTION=database` in `.env`:

```typescript
import { env } from '@pondoknusa/config';

export default {
  default: env('QUEUE_CONNECTION', 'database'),
  connections: {
    database: {
      driver: 'database',
      table: 'jobs',
      connection: 'sqlite',
      retryAfter: 90,
    },
  },
  failed: { table: 'failed_jobs' },
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
} satisfies import('@pondoknusa/events').EventsConfig;
```

Dispatch from routes, jobs, or services:

```typescript
import { Events, fire } from '@pondoknusa/core';
import { UserRegistered } from '../events/user-registered.js';

await fire(new UserRegistered({ userId: 1 }));

Events.listen(UserRegistered, async (event) => {
  console.log(event.data.userId);
});

await Events.dispatch(new UserRegistered({ userId: 2 }));
```

Typed event and listener classes:

```typescript
import { Event, Listener } from '@pondoknusa/events';

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
import { EventSubscriber } from '@pondoknusa/events';
import type { EventDispatcher } from '@pondoknusa/events';

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
} satisfies import('@pondoknusa/events').EventsConfig;
```

**Queued listeners** extend `QueuedListener` (Laravel's `ShouldQueue`). They are serialized to a `CallQueuedListener` job instead of running inline:

```typescript
import { QueuedListener } from '@pondoknusa/events';

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
} satisfies import('@pondoknusa/events').EventsConfig;
```

Register `QueueServiceProvider` **before** `EventServiceProvider`, run `pondoknusa queue:work`, and queued listeners execute on the worker.

### Authentication

Session-based **web guard**, **API token guard** (`auth:api`), policies, password reset, social OAuth, and an optional **OAuth2 authorization server**.

```bash
pondoknusa auth:install
pondoknusa migrate
```

Register facades in `main.ts`: `setAuthApplication`, `setGateApplication`, `setPasswordApplication`.

`AuthServiceProvider` registers **StartSession**, global **CSRF** (419 on failure), **`auth`**, **`auth:api`**, and **`guest`** middleware.

```typescript
import { Auth, Gate, Password } from '@pondoknusa/core';

await Auth.attempt({ email, password });
const token = await Auth.createToken('mobile', ['posts:read'], { expiresIn: '90d' });
await Auth.revokeToken(token.id);
await Password.sendResetLink(email);
await Gate.authorize(Auth.user(), 'update', post);
```

| Feature | Notes |
|---------|--------|
| **Policies** | Map models in `config/auth.ts` `policies`; `Gate.authorize(user, ability, model)` |
| **Password reset** | Timing-safe token comparison; `Password.sendResetLink` / `Password.reset` |
| **API tokens** | `tyr_<secret>` format; hashed at rest; `token_prefix`, expiry, IP whitelist, revocation |
| **Token abilities** | `createTokenAbilityMiddleware('ability')`; `request.tokenAbilities` on bearer auth |
| **Social OAuth** | GitHub, Google, Discord, Microsoft, X, Facebook, LinkedIn, Apple — all with **PKCE** |
| **Custom providers** | `pondoknusa make:social-driver acme` + `registerOAuthDriver()` |
| **OAuth2 server** | `pondoknusa oauth:install`; grants: authorization_code (+ PKCE), client_credentials, refresh_token |
| **Session drivers** | `array`, `database`, `redis`; `SESSION_SECURE` for production cookies |

Full guide: [docs/guide/auth.md](./docs/guide/auth.md).

#### OAuth2 authorization server

```bash
pondoknusa oauth:install
npm install @pondoknusa/auth-oauth
pondoknusa migrate
pondoknusa oauth:client:create "My App" --redirect=http://127.0.0.1:3000/callback
```

Register `OAuthServerServiceProvider` in `src/main.ts` (done by `oauth:install`). Protect routes with `auth:oauth` middleware. Endpoints: `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, `/oauth/userinfo`.

### Post-quantum cryptography

`@pondoknusa/crypto` provides ML-KEM, ML-DSA, SLH-DSA, and hybrid X25519 + ML-KEM-768 encryption via native OpenSSL PQC on Node.js 26+.

```bash
pondoknusa crypto:generate-keys --algorithm=hybrid-x25519-ml-kem-768
pondoknusa crypto:generate-keys --algorithm=ml-dsa-65
```

Add `config/crypto.ts` to enable framework integrations:

| Integration | Config | Effect |
|-------------|--------|--------|
| **Session encryption** | `session.encrypt: true` | AES-256-GCM encrypted session payloads in database/redis |
| **OAuth token signing** | `oauth.signTokens: true` | ML-DSA signed `oat_<payload>.<signature>` access tokens |

```typescript
import { CryptoManager } from '@pondoknusa/crypto';

const crypto = new CryptoManager();
const keys = crypto.generateKeys('hybrid-x25519-ml-kem-768');
const envelope = crypto.encrypt('secret', keys.publicKey);
```

Full guide: [docs/guide/crypto.md](./docs/guide/crypto.md).

### Testing

`@pondoknusa/testing` brings Laravel-style feature tests on top of Vitest:

```bash
npm test                    # in an app created with pondoknusa new
pondoknusa make:test Posts     # tests/feature/posts.test.ts
```

```typescript
import { Application } from '@pondoknusa/core';
import { TestCase, withPondoknusaTest, fake, mockInstance } from '@pondoknusa/testing';

class AppTest extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir);
  }
  protected override async configureApplication(app) {
    // import routes, register providers, wireFacades via setUp()
  }
}

const t = withPondoknusaTest(AppTest);

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

New apps get `vitest.config.ts`, `tests/feature/example.test.ts`, and `@pondoknusa/testing` as a dev dependency.

### Cache, mail, and notifications

New projects ship `config/cache.ts`, `config/mail.ts`, and `config/notifications.ts`, with providers registered in `src/main.ts`.

```typescript
import { Cache, Mail, Notifications, Mailable, Notification } from '@pondoknusa/core';

await Cache.remember('stats', 300, async () => computeStats());
await Mail.to('user@example.com').send(new WelcomeMail());
await Notifications.send(user, new InvoicePaidNotification());
```

| Facade | Drivers / channels |
|--------|-------------------|
| `Cache` | `array`, `file` (`storage/framework/cache`), **`redis`** |
| `Mail` | `log`, `array` (tests), **`smtp`**; **`shouldQueue()`** → `SendMailable` job |
| `Notifications` | `mail`, `database`; **`shouldQueue()`** → `SendQueuedNotification` (default **`database`** queue) |

Use the **array** mail connection in tests to assert `mail.transport('array').messages`.

**SMTP** (`config/mail.ts` → `smtp` connection): set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, then `default: 'smtp'`.

**Queued mailables**: override `shouldQueue()` on your `Mailable`; Pondoknusa serializes the built message into `SendMailable` (`mail.queueConnection` / `queue` in config, default **`database`**).

**Queued notifications**: override `shouldQueue()` on your `Notification` class; Pondoknusa pushes `SendQueuedNotification` via the app queue (`notifications.queueConnection` / `queue` — default **`database`**). Run `pondoknusa queue:work` to process the `jobs` table.

New apps scaffold `jobs`, `failed_jobs`, and `notifications` migrations and set `config/queue.ts` default to **`database`**.

### Service providers

```typescript
import { ServiceProvider } from '@pondoknusa/core';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('app.name', 'Pondoknusa');
  }
}
```

## Development

```bash
npm test          # Run all package tests (requires Node 26+; 700+ tests)
npm run build     # Build all packages
npm run typecheck # Type-check via project references
```

## Migrating from Tyravel

Pondoknusa is a **rename** of Tyravel — same codebase, new package scope and branding. npm does **not** allow renaming packages; you publish under `@pondoknusa/*` and deprecate `@tyravel/*` separately.

| Before (Tyravel) | After (Pondoknusa) |
|------------------|-------------------|
| `@tyravel/core` | `@pondoknusa/core` |
| `tyravel` CLI | `pondoknusa` CLI |
| `tyravel.json` | `pondoknusa.json` |
| `TYRAVEL_*` env vars | `PONDOKNUSA_*` |
| `thesimonharms/tyravel` | `pondoknusa/pondoknusa` |

```diff
# package.json
- "@tyravel/core": "^1.0.3"
+ "@pondoknusa/core": "^2.0.0"

# scaffold
- npm create tyravel@latest
+ npm create pondoknusa@latest
```

Legacy `@tyravel/*` installs show an npm deprecation notice pointing here. `.tyr` templates are unchanged.

## Publishing (`@pondoknusa/*`)

npm uses **passkeys** for interactive sign-in — there is no authenticator OTP to type. Scripts and CI need either **trusted publishing** (OIDC from GitHub Actions) or a **granular access token**.

Releases: push a `v*` tag and the [Release workflow](.github/workflows/release.yml) publishes to the [`@pondoknusa` npm org](https://www.npmjs.com/org/pondoknusa).

```bash
npm run release:prepare -- patch   # bumps, tests, tags, pushes
```

### CI publish (recommended)

1. On [npmjs.com](https://www.npmjs.com), open each package (or configure as you publish) → **Settings → Trusted publishing**
2. Add GitHub Actions: org **`pondoknusa`**, repo **`pondoknusa`**, workflow **`release.yml`**
3. The workflow already requests `id-token: write` for OIDC — no long-lived publish token needed once trusted publishing is linked

For the **first** publish of each new package name, you may need a one-time granular token (see below) before trusted publishing can be attached to that package.

### Granular token (scripts + first publish)

Create at [npmjs.com → Access Tokens](https://www.npmjs.com/settings/~/tokens):

- **Bypass two-factor authentication** — required for non-interactive publish/deprecate (passkeys cannot run in scripts)
- **Packages and scopes** → read-write on `@pondoknusa/*` (publish) and `@tyravel/*` (deprecate)
- Store as `NPM_TOKEN` in [GitHub Actions secrets](https://github.com/pondoknusa/pondoknusa/settings/secrets/actions)

Deprecate legacy `@tyravel/*` after `@pondoknusa/*` is live:

```bash
npm login
./scripts/deprecate-tyravel.sh   # interactive passkey per package
```

Non-interactive (CI): `NODE_AUTH_TOKEN=<granular-token> node scripts/deprecate-tyravel.mjs`

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Documentation

The [docs site](./docs/) includes:

- **Guide** — concepts (routing, ORM, auth, views, …)
- **Reference** — auto-generated `@pondoknusa/*` package exports and CLI commands (`npm run docs:generate`)
- **Tutorials** — zero-to-deploy track
- **Cookbook** — focused recipes (realtime, RAG, testing)

Run locally:

```bash
npm run docs:dev      # regenerates reference + starts VitePress
npm run docs:build    # production build (also runs in CI)
```

Published to [pondoknusa.dev](https://pondoknusa.dev) via GitHub Pages (`.github/workflows/docs.yml`). Security: [SECURITY.md](./SECURITY.md).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for release tiers.

### Shipped highlights (through v2.0.0)

- [x] Service container, HTTP router, kernel, `Route` facade, CLI scaffolding
- [x] Eloquent-style ORM, views, queue/events, cache, mail, notifications, broadcasting, storage
- [x] Auth: session + API tokens, CSRF, social OAuth (PKCE), policies, password reset
- [x] OAuth2 authorization server (`@pondoknusa/auth-oauth`) and `@pondoknusa/testing` HTTP client
- [x] Post-quantum crypto on Node 26+ (`@pondoknusa/crypto`): ML-KEM, ML-DSA, SLH-DSA, hybrid encryption
- [x] Native WebSocket broadcasting (`@pondoknusa/broadcasting-websocket`) and Echo client with zero peer deps
- [x] AI-native stack (v0.14): vector search, RAG, GraphQL, MCP server
- [x] Infrastructure depth (v0.15): taggable cache, notification channels, testing fakes
- [x] Core surface polish (v0.16): route model binding, signed URLs, typed view props, `view:catalog`, prunable models — sync API sweep complete ahead of 1.0
- [x] Documentation site & semver strict (v1.0): hosted docs at [pondoknusa.dev](https://pondoknusa.dev), facade reference, deploy walkthroughs, cookbook complete
- [x] Optional drivers only when you need them — five third-party production deps across the whole monorepo

## License

MIT