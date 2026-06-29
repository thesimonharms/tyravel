# Testing

Run the project suite with the Pondoknusa CLI wrapper (sets `APP_ENV=testing` consistently):

```bash
pondoknusa test
pondoknusa test -- --watch
```

Scaffolded apps use `pondoknusa test` in `package.json` instead of calling Vitest directly.

## In-memory SQLite (recommended default)

For fast, isolated feature tests, point each worker at an in-memory database:

```env
# .env.testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
QUEUE_CONNECTION=sync
MAIL_MAILER=array
```

In `vitest.config.ts`, load `.env.testing` or set `env` in the test config. When using `:memory:` with parallel workers, give each worker its own database (Vitest `pool: 'forks'` with `fileParallelism: true` is safe because each fork gets a fresh process and memory DB).

Use `usesDatabaseTransactions` on `TestCase` when tests share a file-backed SQLite file.

Use `@pondoknusa/testing` with Vitest:

```typescript
import { describe, it } from 'vitest';
import { TestCase } from '@pondoknusa/testing';

class FeatureTest extends TestCase {
  protected override async setUp() {
    await super.setUp();
    // register providers, run migrations, etc.
  }
}

describe('users', () => {
  it('lists users', async () => {
    const test = new FeatureTest();
    await test.setUp();

    const response = await test.get('/api/users');
    response.assertStatus(200).assertJson({ ok: true });

    await test.tearDown();
  });
});
```

## HTTP test client

- `get`, `post`, `put`, `patch`, `delete` — run through `HttpKernel`
- `withToken('...')` — attach Bearer token
- `withCsrf()` — set session `_csrf_token` and send `X-CSRF-TOKEN` (required for routes behind `csrf` middleware)
- `actingAs(user)` / `withSession({ ... })` — inject auth and session state (requires `createTestingMiddleware()` on the app)
- Cookie jar persists session cookies between requests

Routes using the `csrf` middleware reject POST requests without a matching token (HTTP 419). Chain `withCsrf()` before mutating requests:

```typescript
await test.http.withCsrf().post('http://localhost/register', {
  json: { name: 'Ada', email: 'ada@example.com', password: 'secret' },
});
```

`TestCase` registers `createTestingMiddleware()` automatically. Custom test cases that override `setUp()` must call `app.use(createTestingMiddleware())` before boot — see `examples/hello-world/tests/support/reference-test-case.ts`.

## Assertions

```typescript
response.assertStatus(200);
response.assertJson({ name: 'Ada' });       // partial match
response.assertJsonPath('data.0.id', 1);
```

## Container fakes

```typescript
import { fake, mockInstance } from '@pondoknusa/testing';

fake('mail', { send: async () => {} });
```

Wire facades to the test application with `wireFacades(app)` so `Route`, `Auth`, and `Gate` resolve correctly in tests.

## OAuth feature tests

OAuth redirect flows need session state for CSRF/PKCE. Use the HTTP client session helpers:

```typescript
const redirect = await t.http.get('http://localhost/auth/github/redirect');
redirect.assertStatus(302);
const location = redirect.headers.get('location');
expect(location).toContain('github.com');

// Simulate provider callback (stub OAuth driver in tests or use array mail + fakes)
await t.http.get('http://localhost/auth/github/callback?code=test&state=...');
```

Fake the OAuth manager in unit tests:

```typescript
import { fake } from '@pondoknusa/testing';

fake('oauth', {
  redirectUrl: () => 'https://provider.test/authorize',
  handleCallback: async () => ({ id: '1', email: 'ada@example.com', name: 'Ada' }),
});
```

## Broadcasting assertions

When `BROADCAST_CONNECTION=log`, inspect dispatched events via the log driver or fake the broadcaster:

```typescript
const events: string[] = [];
fake('broadcast', {
  channel: () => ({
    broadcast: async (event: string) => { events.push(event); },
  }),
});

await t.http.post('http://localhost/posts', { json: { title: 'Hi' } }).assertStatus(201);
expect(events).toContain('PostCreated');
```

See [Broadcasting](./broadcasting.md) for Echo and WebSocket setup in integration environments.

## Partial reload assertions

Turbo/HTMX-style partial responses expose fragment HTML:

```typescript
const response = await t.http
  .withHeader('X-Pondoknusa-Partial', 'comments')
  .get('http://localhost/posts/1');
response.assertStatus(200);
response.assertSee('class="comment"');
```

Use `View.partial()` / `Response.partial()` in controllers; assert the fragment without the full layout.

## Queued listeners and jobs

When tests use `QUEUE_CONNECTION=database`, queued listeners and mailables persist jobs until a worker processes them. After dispatching HTTP requests that trigger queued work, drain the queue before asserting side effects:

```typescript
// See examples/hello-world/tests/support/reference-test-case.ts
await test.drainQueue();
```

Use `MAIL_MAILER=array` (or fakes) together with queue draining to assert outbound mail in feature tests.

## SSR and hydration assertions

When testing pages that use `@island`, capture the hydration manifest alongside the HTML:

```typescript
const view = await renderView(app, 'welcome', { name: 'Ada' });

view.assertSee('Hello Ada');
view.assertIsland('counter');
view.assertHydrationManifest({
  islands: [{ id: 'counter', html: expect.stringContaining('button'), props: { count: 0 } }],
});
```

HTTP feature tests can assert the injected manifest on the full document:

```typescript
const response = await test.get('/');
response.assertStatus(200);
response.assertSee('data-tyr-island="counter"');
response.assertSee('id="tyr-hydration"');
```

## Pest-style ergonomics

Import Vitest helpers and Pondoknusa lifecycle sugar from one module:

```typescript
import { describe, expect, test, uses } from '@pondoknusa/testing/pest';

class FeatureTest extends TestCase {
  protected createApplication() {
    return new Application('/tmp/app');
  }
}

const t = uses(FeatureTest);

describe('posts', () => {
  test('lists posts', async () => {
    await t.http.get('/posts').assertOk();
  });
});
```

`uses()` is an alias for `withPondoknusaTest()`. `dataset()` formats rows for `test.each()`:

```typescript
import { dataset, test } from '@pondoknusa/testing/pest';

test.each(dataset([
  { slug: 'draft', status: 201 },
  { slug: 'published', status: 200 },
]))('creates $slug', async ({ slug, status }) => {
  // ...
});
```

## Parallel test runner (Vitest workspaces)

Large Pondoknusa apps benefit from Vitest workspaces so unit, feature, and package suites run in parallel without sharing one giant config.

**Monorepo root** — keep package tests isolated per project:

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'examples/*/vitest.config.ts',
]);
```

**Application** — split fast unit tests from HTTP feature tests:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['tests/unit/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: true,
  },
});
```

```typescript
// vitest.feature.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'feature',
    include: ['tests/feature/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: false, // one app boot at a time per worker
    maxWorkers: 2,
  },
});
```

Register both in the workspace:

```typescript
export default defineWorkspace([
  './vitest.config.ts',
  './vitest.feature.config.ts',
]);
```

Guidelines for Pondoknusa feature tests:

- Prefer `uses(FeatureTest)` / `withPondoknusaTest()` so each example gets a fresh `Application`.
- Enable `usesDatabaseTransactions` on `TestCase` when tests touch SQLite/Postgres — avoids cross-test pollution when files run in parallel.
- Keep `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync` (or fakes) in the test `.env` so parallel workers do not contend on shared mail/queue state.
- Run `npm test -- --project feature` to execute only the feature project in CI.