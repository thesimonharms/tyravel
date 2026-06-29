# Migrating from Laravel

Pondoknusa borrows Laravel's mental model — routes, middleware, Eloquent-style models, queues, and Blade-like views — while targeting TypeScript and Node.js 26+ (or Bun). This guide maps familiar Laravel concepts to Pondoknusa equivalents.

## Application bootstrap

| Laravel | Pondoknusa |
|---------|---------|
| `bootstrap/app.php` | `src/main.ts` + `src/providers/app-service-provider.ts` |
| `config/*.php` | `config/*.ts` with typed `env()` and optional `schema` |
| `.env` | `.env` (same idea; validated on boot) |
| `php artisan serve` | `pondoknusa dev` or `pondoknusa serve` |
| `php artisan` | `pondoknusa` CLI (`migrate`, `make:*`, `queue:work`, …) |

## Routing

| Laravel | Pondoknusa |
|---------|---------|
| `routes/web.php` | `src/routes/web.ts` |
| `Route::get('/', …)` | `Route.get('/', …)` from `@pondoknusa/core` |
| Route model binding | `request.routeModel('post')` |
| `php artisan route:list` | `pondoknusa route:list` |
| `php artisan route:cache` | `pondoknusa route:cache` |

Controllers are TypeScript classes with async methods. Invokable controllers use `__invoke`.

## Views

| Laravel | Pondoknusa |
|---------|---------|
| Blade (`.blade.php`) | Tyr templates (`.tyr`) |
| `@extends`, `@section` | `@layout`, `@section`, `@yield` |
| `<x-alert />` components | `@component('alert')` |
| Livewire / islands | `@island` + client `registerIsland()` |
| Programmatic UI | `.tyr.ts` views with `render()` / `mount()` |

Run `pondoknusa view:types` for typed props (`ViewPropsMap`). Lint with `pondoknusa view:lint --strict`.

## Eloquent → models

| Laravel | Pondoknusa |
|---------|---------|
| `User::find(1)` | `await User.find(1)` |
| `$user->posts()` | `user.posts()` relation helpers |
| Migrations | `database/migrations/*.ts` + `pondoknusa migrate` |
| Factories / seeders | `pondoknusa make:factory`, `pondoknusa db:seed` |
| Soft deletes | `SoftDeletes` trait on models |

Models live in `src/models/` and extend `Model` from `@pondoknusa/database`.

## Auth

| Laravel | Pondoknusa |
|---------|---------|
| `php artisan install:api` / Breeze | `pondoknusa auth:install` |
| Socialite | Built-in OAuth drivers in `@pondoknusa/auth` |
| `Auth::user()` | `Auth.user()` facade |
| Gates / policies | `Gate` + policy classes |

## Queues & events

| Laravel | Pondoknusa |
|---------|---------|
| `ShouldQueue` listeners | Queue-backed listeners via `@pondoknusa/queue` |
| `php artisan queue:work` | `pondoknusa queue:work` or `pondoknusa dev --queue` |
| `event()` / `Event::dispatch` | `Events.dispatch()` |
| `Bus::dispatch` | `Bus.dispatch()` with auto-resolved handlers |

Register explicit handlers with `Bus.register(Command, Handler)` when you prefer explicit wiring over convention.

## Mail & notifications

| Laravel | Pondoknusa |
|---------|---------|
| Mailable classes | Classes implementing mail contracts in `@pondoknusa/mail` |
| `php artisan make:notification` | `pondoknusa make:notification` (via notifications package) |
| `MAIL_MAILER=log` | Same env key; `log` driver for local dev |

## Testing

| Laravel | Pondoknusa |
|---------|---------|
| PHPUnit / Pest | Vitest + `@pondoknusa/testing` |
| `php artisan test` | `pondoknusa test` |
| `$this->get('/')` | `test.http.get('/')` with assertion helpers |
| `actingAs($user)` | `test.http.actingAs(user)` |

See [Testing](./testing.md) for HTTP recipes, queue draining, and parallel Vitest workspaces.

## Deployment

| Laravel | Pondoknusa |
|---------|---------|
| `php artisan config:cache` | `pondoknusa config:cache` / `config:clear` |
| `php artisan view:cache` | `pondoknusa view:cache` |
| Forge / Vapor patterns | `deploy/` scaffold (Docker, Fly, Railway) |
| Health checks | `/health/live` and `/health/ready` |

Run `pondoknusa deploy:check` before shipping to validate doctor checks, route compilation, and view cache.

## Debugging

| Laravel | Pondoknusa |
|---------|---------|
| Telescope (paid/complex) | `pondoknusa debug:install` + debug bar |
| Query log | Debug bar query count + N+1 warnings |
| `php artisan tinker` | `pondoknusa shell` (`.routes`, `.models`, persistent history) |

## Suggested first steps

1. `npm create pondoknusa@latest` or `pondoknusa new my-app --template=saas`
2. `pondoknusa migrate` and `pondoknusa dev`
3. Port routes from `routes/web.php` to `src/routes/web.ts`
4. Convert Blade layouts to `.tyr` and run `pondoknusa view:lint`
5. Move models and migrations; run `pondoknusa test`

For a working reference app, see `examples/hello-world` and `examples/saas-starter`.