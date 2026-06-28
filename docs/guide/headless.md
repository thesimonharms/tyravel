# Headless API mode

Use Tyravel as a **backend-only** framework: JSON routes, queues, mail, and the full service container — without views, SSR, Echo, or client assets.

## Create a headless app

```bash
tyravel new my-api --headless
# or
tyravel new my-api --template=headless
```

With `npm create`:

```bash
npm create tyravel@latest my-api -- --headless
```

The scaffold includes:

- `src/routes/api.ts` — versioned routes under `/api/v1/*`
- `config/app.ts` — `headless: true` for tooling
- `tyravel.json` — `"mode": "headless"`
- No `resources/views/`, `@tyravel/echo`, or view-types CI workflow

## Quick start

```bash
cd my-api
npm install
tyravel migrate
tyravel dev
curl http://127.0.0.1:3000/api/v1/health
```

## Routes

Headless apps register routes in `src/routes/api.ts`:

```typescript
import { Route } from '@tyravel/core';
import { Response } from '@tyravel/http';

Route.prefix('api/v1').middleware('throttle:api').group((routes) => {
  routes.get('/health', () => Response.json({ status: 'ok' }));
});
```

The root path `/` returns a small JSON index with links to this guide.

## Authentication

Run `tyravel auth:install` for guards and migrations. On headless projects it scaffolds:

- `config/auth.ts` with default guard `api`
- Routes under `/api/v1/*` (login, tokens, me) without CSRF middleware
- `src/main.ts` without `ViewServiceProvider`

Headless apps return JSON errors by default — no HTML error pages. Use Bearer tokens (`auth:api`) or session login at `POST /api/v1/login`.

## Boot profile

After `await app.boot()`, call `applyBootProfile()` so runtime tooling knows the app is headless:

```typescript
import { applyBootProfile, ConfigRepository } from '@tyravel/core';

const config = app.make(ConfigRepository);
await applyBootProfile(app, config);
```

This enables JSON exception responses even when clients send `Accept: text/html`. Full-stack apps can use `registerViewStack(app)` when not headless.

## Development

`tyravel dev` hot-reloads **config and routes** in headless mode. View watching is disabled because there are no `.tyr` templates.

Concurrent workers still work:

```bash
tyravel dev              # web + queue worker + debug:watch (when debug is installed)
tyravel dev --no-queue   # web only
```

## Deploy checks

`tyravel deploy:check` runs doctor and route-cache validation. View compilation is skipped when headless mode is detected.

```bash
tyravel deploy:check
```

`tyravel doctor` reports headless mode and skips production view-cache requirements.

## Converting an existing app

To mark an existing API-only project as headless:

1. Set `headless: true` in `config/app.ts`
2. Add `"mode": "headless"` to `tyravel.json` (optional but recommended)
3. Move routes to `src/routes/api.ts` and import them from `src/main.ts`
4. Remove unused view, Echo, and SSR dependencies from `package.json`

## When to use headless vs `--template=api`

| | `--headless` | `--template=api` |
|---|---|---|
| Views / SSR | None | Optional (full stack deps remain) |
| Route file | `src/routes/api.ts` | `src/routes/web.ts` |
| Client assets | None | Echo stub included |
| `package.json` | Slim (no views/echo) | Full default stack |

Choose **headless** when you want a dedicated API service. Choose **api** when you might add SSR or views later without re-scaffolding.

## Next steps

- [Routing](./routing) — groups, middleware, controllers
- [API resources](./api-resources) — transform models for JSON
- [Authentication](./auth) — guards and tokens
- [Deployment](./deployment) — Docker, Fly, Railway