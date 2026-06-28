# Migrating from Laravel

Tyravel borrows Laravel's mental model — routes, middleware, Eloquent-style models, queues, and Blade-like views — while targeting TypeScript and Node.js 26+ (or Bun). This guide maps familiar Laravel concepts to Tyravel equivalents.

## Application bootstrap

| Laravel | Tyravel |
|---------|---------|
| `bootstrap/app.php` | `src/main.ts` + `src/providers/app-service-provider.ts` |
| `config/*.php` | `config/*.ts` with typed `env()` and optional `schema` |
| `.env` | `.env` (same idea; validated on boot) |
| `php artisan serve` | `tyravel dev` or `tyravel serve` |
| `php artisan` | `tyravel` CLI (`migrate`, `make:*`, `queue:work`, …) |

## Routing

| Laravel | Tyravel |
|---------|---------|
| `routes/web.php` | `src/routes/web.ts` |
| `Route::get('/', …)` | `Route.get('/', …)` from `@tyravel/core` |
| Route model binding | `request.routeModel('post')` |
| `php artisan route:list` | `tyravel route:list` |
| `php artisan route:cache` | `tyravel route:cache` |

Controllers are TypeScript classes with async methods. Invokable controllers use `__invoke`.

## Views

| Laravel | Tyravel |
|---------|---------|
| Blade (`.blade.php`) | Tyr templates (`.tyr`) |
| `@extends`, `@section` | `@layout`, `@section`, `@yield` |
| `<x-alert />` components | `@component('alert')` |
| Livewire / islands | `@island` + client `registerIsland()` |
| Programmatic UI | `.tyr.ts` views with `render()` / `mount()` |

Run `tyravel view:types` for typed props (`ViewPropsMap`). Lint with `tyravel view:lint --strict`.

## Eloquent → models

| Laravel | Tyravel |
|---------|---------|
| `User::find(1)` | `await User.find(1)` |
| `$user->posts()` | `user.posts()` relation helpers |
| Migrations | `database/migrations/*.ts` + `tyravel migrate` |
| Factories / seeders | `tyravel make:factory`, `tyravel db:seed` |
| Soft deletes | `SoftDeletes` trait on models |

Models live in `src/models/` and extend `Model` from `@tyravel/database`.

## Auth

| Laravel | Tyravel |
|---------|---------|
| `php artisan install:api` / Breeze | `tyravel auth:install` |
| Socialite | Built-in OAuth drivers in `@tyravel/auth` |
| `Auth::user()` | `Auth.user()` facade |
| Gates / policies | `Gate` + policy classes |

## Queues & events

| Laravel | Tyravel |
|---------|---------|
| `ShouldQueue` listeners | Queue-backed listeners via `@tyravel/queue` |
| `php artisan queue:work` | `tyravel queue:work` or `tyravel dev --queue` |
| `event()` / `Event::dispatch` | `Events.dispatch()` |
| `Bus::dispatch` | `Bus.dispatch()` with auto-resolved handlers |

Register explicit handlers with `Bus.register(Command, Handler)` when you prefer explicit wiring over convention.

## Mail & notifications

| Laravel | Tyravel |
|---------|---------|
| Mailable classes | Classes implementing mail contracts in `@tyravel/mail` |
| `php artisan make:notification` | `tyravel make:notification` (via notifications package) |
| `MAIL_MAILER=log` | Same env key; `log` driver for local dev |

## Testing

| Laravel | Tyravel |
|---------|---------|
| PHPUnit / Pest | Vitest + `@tyravel/testing` |
| `php artisan test` | `tyravel test` |
| `$this->get('/')` | `test.http.get('/')` with assertion helpers |
| `actingAs($user)` | `test.http.actingAs(user)` |

See [Testing](./testing.md) for HTTP recipes, queue draining, and parallel Vitest workspaces.

## Deployment

| Laravel | Tyravel |
|---------|---------|
| `php artisan config:cache` | `tyravel config:cache` / `config:clear` |
| `php artisan view:cache` | `tyravel view:cache` |
| Forge / Vapor patterns | `deploy/` scaffold (Docker, Fly, Railway) |
| Health checks | `/health/live` and `/health/ready` |

Run `tyravel deploy:check` before shipping to validate doctor checks, route compilation, and view cache.

## Debugging

| Laravel | Tyravel |
|---------|---------|
| Telescope (paid/complex) | `tyravel debug:install` + debug bar |
| Query log | Debug bar query count + N+1 warnings |
| `php artisan tinker` | `tyravel shell` (`.routes`, `.models`, persistent history) |

## Suggested first steps

1. `npm create tyravel@latest` or `tyravel new my-app --template=saas`
2. `tyravel migrate` and `tyravel dev`
3. Port routes from `routes/web.php` to `src/routes/web.ts`
4. Convert Blade layouts to `.tyr` and run `tyravel view:lint`
5. Move models and migrations; run `tyravel test`

For a working reference app, see `examples/hello-world` and `examples/saas-starter`.