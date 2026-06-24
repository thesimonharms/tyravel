# Tyravel Roadmap

Post-v0.1.0 direction. v0.1 shipped the core Laravel-shaped stack; subsequent releases focus on polish, production adapters, and real-world ergonomics.

## Tier 1 — Credibility (v0.2.0)

Make the framework trustworthy for early adopters.

- [x] **Reference app** — Upgrade `examples/hello-world` (or add `examples/blog`) with `auth:install`, a queued job, a mailable, and a feature test
- [x] **`.env` support** — `loadEnv()`, `env()` helper, `.env.example`, config stubs wired to environment variables
- [x] **Exception handler polish** — `ExceptionHandler` with debug HTML pages, consistent JSON API errors, `HttpException` base class, 405 Method Not Allowed
- [x] **CI + release script** — GitHub Actions CI (typecheck/build/test on push+PR), automated npm publish on tag, `npm run release:prepare` version bumper

## Tier 2 — Daily-driver quality (v0.2.x)

Close gaps developers hit on day two of a real project.

- [x] **ORM eager loading** — `with()` to avoid N+1 queries on relationships
- [x] **Seeders + factories** — Dev data and test ergonomics (`tyravel make:factory`, `db:seed`)
- [x] **Redis queue + cache drivers** — First production-grade external adapter
- [x] **Driver-aware migrations** — Postgres/MySQL schema parity beyond SQLite-centric blueprints

## Tier 3 — Adoption (v0.3+)

Grow the ecosystem and Laravel parity for API-heavy apps.

- [x] **Form requests** — Validation + authorization on controller actions
- [x] **API resources / transformers** — Structured JSON serialization
- [x] **Documentation site** — Tutorials beyond the monorepo README
- [x] **More auth adapters** — Redis/database session drivers, additional OAuth providers

## Tier 4 — Framework depth (v0.4.0)

TypeScript-native depth for any full-stack app — not domain-specific features. Laravel-shaped ergonomics without PHP ceremony; batteries included, magic by default.

### Data layer

- [x] **DB transactions** — `transaction()` helper with async-native, typed usage
- [x] **Model casts** — typed attribute serialization (`datetime`, `json`, `boolean`, …)
- [x] **Soft deletes** — `deleted_at`, `withTrashed()`, `restore()`, `forceDelete()`
- [x] **Model lifecycle hooks** — `creating`, `created`, `updating`, `updated`, `deleting`, `deleted`

### Operations

- [x] **Logging** — structured `Log` facade with typed context (stdout, file, stack drivers)
- [x] **Scheduler** — task registration API and `tyravel schedule:run` for cron
- [x] **Health checks** — connectivity probes for database, Redis, and app readiness
- [x] **Session maintenance** — `tyravel session:prune` for database session driver

### HTTP & deployment

- [x] **CORS middleware** — config-driven cross-origin support for APIs
- [x] **Rate limiting** — throttle middleware with configurable limits
- [x] **Trusted proxies** — correct client IP and scheme behind load balancers

### Files

- [x] **Storage** — filesystem abstraction with local driver
- [x] **S3 storage driver** — cloud-compatible object storage adapter

### CLI & DX

- [x] **`tyravel route:list`** — named routes, methods, middleware, and handlers
- [x] **`tyravel make:middleware`** — scaffold custom middleware
- [x] **`tyravel make:command`** — scaffold console commands

## Tier 5 — Magic DX (v0.5.0)

Recreate the magic of Laravel in a way that feels TypeScript native, with developer and execution speed. No docs work — everything here is in-code DX.

### P0 — Must ship

- [x] **Collection** — `@tyravel/collection` fluent, type-safe chainable collection with 50+ methods, lazy evaluation, and a `collect()` helper. The single most iconic Laravel DX moment, made TypeScript-native.
- [x] **`tyravel shell`** — Interactive TypeScript REPL that boots the full application. All facades pre-imported (`Route`, `DB`, `Auth`, `Cache`, …), app models auto-loaded, top-level `await` support. Drop into a prompt and play.
- [x] **Global helpers** — `now()`, `today()`, `collect()`, `throw_if()`, `throw_unless()`, `optional()`, `with()`, `transform()`, `retry()`, `report()`, `dd()`, `dump()`, `base_path()`, `app_path()`, and more — all in `@tyravel/support`.

### P1 — Strong want

- [x] **Stringable** — `Stringable.of('hello')->slug()->title()->toString()`. Fluent string chaining.
- [x] **Pipeline** — `Pipeline.send(input).through([...pipes]).then(result => ...)`. Clean data-through-pipes for middleware stacks, form requests, and data transformations.
- [x] **Macroable** — `Request.macro('jsonApi', fn(...) => ...)`. Extend core classes (`Request`, `Response`, `Collection`, `QueryBuilder`) at runtime.
- [x] **Conditionable** — `.when(condition, q => q.where(...))` on `QueryBuilder`, `Collection`, `Pipeline`.

### P2 — If scope allows

- [x] **Auto-discovery** — Convention-based scanning of `app/providers/` and `app/commands/`. Drop a provider or command file in the right directory, it's auto-registered.
- [x] **Interactive `tyravel new`** — Prompt for database driver, auth guard, queue driver, mail driver, redis. Progress bar (`npm install`) in interactive mode. Builds on the existing `tyravel new` which already handled DB + redis prompts.
- [x] **Command bus** — `Bus.dispatch(new SendWelcomeEmail(user))`. Auto-resolve handlers from the container, explicit mapping via `Bus.map()`, self-handling commands supported.

## Tier 6 — Templating engine (v0.6.0)

Make `.tyr` feel as productive as Blade for full-stack apps — TypeScript-native, compiled, and testable. Builds on the existing `@tyravel/views` compiler (layouts, sections, `@if`/`@foreach`, `@include`, one-line `@component`).

### P0 — Must ship

- [x] **Component blocks & slots** — `@component('card')` … `@slot('footer')` … `@endcomponent`; default slot via `{{ $slot }}` in child templates. The biggest gap vs one-line `@component` includes today.
- [x] **@stack / @push** — defer scripts, styles, and meta into layout stacks (`@push('scripts')` / `@stack('scripts')`).
- [x] **@forelse / @empty** — list rendering with an empty-state branch without nested `@if`.
- [x] **@unless, @isset, @empty** — common conditionals developers reach for on day one of a UI.

### P1 — Strong want

- [x] **Custom directives** — `View::directive('datetime', handler)` to register project-specific `@datetime(...)` tags without forking the compiler.
- [x] **View composers** — attach shared data to named views or wildcards (`View::composer('posts.*', fn => ...)`).
- [x] **Conditional includes** — `@includeIf`, `@includeWhen` for partials.
- [x] **Auth-aware directives** — `@auth`, `@guest`, `@can` wired to `@tyravel/auth` (optional when auth provider is registered).
- [x] **View helpers in templates** — `route()`, `asset()`, `config()` (and `old()` for forms) available in expression context.

### P2 — If scope allows

- [x] **Compiled view cache** — write compiled ops to `storage/framework/views`; `tyravel view:cache` and `view:clear` commands.
- [x] **Anonymous components** — `resources/views/components/*.tyr` auto-resolvable as `@component('alert')` without manual paths.
- [x] **View testing** — `assertSee` / `assertDontSee` helpers in `@tyravel/testing` for rendered HTML assertions.
- [x] **`make:component`** — scaffold component templates with slot stubs and optional class binding.
- [x] **@once** — render a block only once per request (useful for push/stack deduplication).

### P3 — Forms & everyday UI

Day-two ergonomics for server-rendered apps: forms, validation feedback, and control-flow sugar.

- [x] **Form directives** — `@csrf`, `@method('PUT')`, and hidden `_token` / `_method` fields wired to session and routing.
- [x] **Validation error blocks** — `@error('field')` … `@enderror` and `@if ($errors->any())` style access to validation messages in context.
- [x] **Form state helpers** — `@checked`, `@selected`, `@disabled`, and `@readonly` driven by `old()` and submitted values.
- [x] **`@json` directive** — safely embed JSON in `<script>` tags without manual `JSON.stringify` + escaping mistakes.
- [x] **`@switch` / `@case`** — cleaner multi-branch UI than nested `@if` / `@elseif` chains.

### P4 — Component depth

Move anonymous components from "included partials" toward first-class, reusable UI primitives.

- [x] **`@props` declaration** — top-of-file `@props(['title', 'count' => 0])` merges defaults into child component context.
- [x] **Attribute bag** — `$attributes` in component templates; merge classes/styles onto the root element.
- [x] **`@class` / `@style` helpers** — conditional class lists and inline style maps (Tailwind-friendly).
- [x] **Class-based component data** — `make:component --class` providers auto-merge `data()` into render context when a binding exists.
- [x] **Default slot content** — fallback markup inside `@slot('name')` … `@endslot` when the parent omits that slot.
- [x] **`@aware`** — child components inherit selected props from a parent component context.

### P5 — Ecosystem & integration

Templating that works across packages, environments, and outbound channels.

- [x] **View namespaces** — `vendor::view.name` syntax for package-published templates (e.g. `@include('admin::partials.nav')`).
- [x] **Environment directives** — `@env`, `@production`, and `@local` for environment-specific markup without `config()` noise.
- [x] **Localization** — `@lang('messages.welcome')` / `__()` helpers in expression context; optional JSON locale files.
- [x] **Mail & notification views** — render `.tyr` templates from `@tyravel/mail` and `@tyravel/notifications` (HTML + plain-text layouts).
- [x] **Build manifest integration** — `@vite` or `@mix`-style helper reading a manifest for versioned CSS/JS in layouts.
- [x] **`@includeFirst`** — try a list of partials and include the first view that exists.

### P6 — DX, performance & debugging

Make large apps maintainable: faster compiles, clearer errors, and better local iteration.

- [x] **`@pushOnce` / `@prepend`** — stack variants for deduplicated or head-prepended assets.
- [x] **`@inject`** — `@inject('stats', 'PostStats')` resolves a container binding into the view context.
- [x] **Fragment caching** — `@fragment('sidebar')` … `@endfragment` with TTL/store-backed cache for expensive partials.
- [x] **Compile error locations** — parse failures report view path and line/column (not opaque regex misses).
- [x] **`tyravel view:watch`** — recompile changed `.tyr` files during `tyravel serve` (dev-only file watcher).
- [x] **`tyravel view:lint`** — static pass for unclosed directives, unknown components, and unsafe `{!! !!}` usage.
- [x] **Production compile mode** — `config/views.ts` `compiled: true` by default in production; skip source reads when cache is warm.

### P7 — Typed, testable, advanced rendering

Longer-horizon bets that keep Tyravel TypeScript-native while closing the gap with mature Blade/Livewire workflows.

- [x] **Typed view props** — `View.render<WelcomeProps>('welcome', props)` with generated or hand-authored prop interfaces per view.
- [x] **Component catalog** — auto-discovered registry of `resources/views/components/*` with names, props, and slots (feeds docs/IDE).
- [x] **View factories in tests** — `renderView('posts.index', data)` test helper with composers/directives pre-wired like HTTP tests.
- [x] **Streaming layouts** — flush early `<head>` / shell HTML while slow sections resolve (chunked `Response.html` integration).
- [x] **Partial hydration hooks** — stable `data-tyr-island` markers + manifest for progressive client enhancement (optional, no Livewire dependency).
- [x] **Programmatic views** — `.tyr.ts` views that export a `render(ctx)` function for logic-heavy UI without stringly directives.
- [x] **Custom escape contexts** — `View::escape('url' | 'js' | 'css', fn)` for context-specific escaping beyond HTML.

## Tier 6.1 — Templating hardening (v0.6.1)

Close the polish gaps found during the Tier 6 audit. Ship before v0.7.0 production work.

- [x] **CLI view commands boot the app** — `tyravel view:cache`, `view:clear`, and `view:lint` boot the application so custom directives, composers, and escape contexts registered in providers are available (not a bare `ViewEngine`).
- [x] **`serve` watcher in server child** — run `view:watch` inside the served process so recompiles apply to the running app, not only the CLI parent.
- [x] **`make:component --class` registration** — scaffolded class-based components auto-register via `View.component()` in the generated provider or service provider stub.
- [x] **`@inject` diagnostics** — warn or fail in dev when `@inject` is used without a registered injector; avoid silent empty context.
- [x] **Unknown custom directive diagnostics** — compile-time or lint-time warning when `@myDirective` has no `View::directive()` handler registered.

## Tier 7 — Production credibility (v0.7.0) ✓

Make Tyravel deployable with confidence. Builds on Tier 6.1 hardening.

- [X] **Config validation** — fail fast at boot when required environment variables are missing or invalid; typed schema per config file.
- [x] **Graceful shutdown** — drain in-flight HTTP requests and queue workers on `SIGTERM` / `SIGINT`; cooperative timeout before force exit.
- [x] **API stability policy** — documented semver guarantees for public `@tyravel/*` surfaces (what is stable, what is experimental, deprecation window). See [STABILITY.md](STABILITY.md).

## Tier 8 — Ecosystem & advanced capabilities (v0.8.0) ✓

Rich developer tooling, async utilities, and real-time operations.

- [x] **Broadcasting** — real-time event broadcasting over WebSockets (Socket.io) or Pusher with dynamic channel authorization
- [x] **HTTP Client** — fluent, chainable HTTP wrapper around fetch with request/response mocking for testing
- [x] **Queue depth** — job chaining, job batching, and cache-backed atomic locks
- [x] **ORM enhancements** — polymorphic relations morphTo/morphMany, query profiling, and pivot table attribute casting
- [x] **Storage depth** — Cloudflare R2 storage driver and secure time-limited temporary URLs

## Tier 9 — Async-native platform (v0.9.0) ✓

Make Tyravel fully async by default: no sync fallbacks, no blocking I/O in the public API, and drivers that assume `await` everywhere.

- [x] **Async-native kernel** — application boot, config load, provider register/boot, and facades expose async-first APIs; deprecate sync-only code paths
  - [x] **9.1** — `loadEnv()` async via `fs/promises`; deprecate `loadEnvSync()`
  - [x] **9.2** — async `readdir` in config loader
  - [x] **9.3** — `ConfigServiceProvider` awaits `loadEnv()`
  - [x] **9.4** — async `discoverProviders` / `discoverCommands`
  - [x] **9.5** — async-first provider contract docs and tests
  - [x] **9.6** — migrate I/O providers to async `register` / `boot`
  - [x] **9.13** — async `View.exists()` and compiled view cache I/O
  - [x] **9.14** — async CLI scaffold I/O (`writeFile`, `findProjectRoot`, `loadProjectConfig`)
  - [x] **9.15** — `examples/hello-world` + CHANGELOG deprecation notes
  - [x] **9.16** — ROADMAP Tier 9 closeout
- [x] **Async-native ORM** — query builder, model persistence, and relations return Promises by default; remove implicit sync SQLite shortcuts where they remain
  - [x] **9.7** — async migration file discovery
  - [x] **9.8** — async seeder file discovery
  - [x] **9.9** — async-native SQLite connection setup (`fs/promises`, deferred open)
- [x] **Async-native queue & events** — dispatch, listen, and broadcast are always async; sync driver retained only for tests
  - [x] **9.10** — `SyncQueue` test-only; removed from `QueueManager` production switch
  - [x] **9.11** — remove `?? 'sync'` queue connection fallbacks
  - [x] **9.12** — remove `sync` from `tyravel new` scaffold; default `database`
- [x] **Async-native filesystem & cache** — storage, cache, and session I/O are non-blocking across all drivers
  - [x] Storage drivers (`LocalDisk`, S3, R2, Supabase) — fetch/async APIs (pre-existing)
  - [x] Cache drivers (`ArrayStore`, `FileStore`, Redis) — async public API (pre-existing)
  - [x] `Queue.dispatch`, `Events.dispatch`, `Broadcast.dispatch` — async facades (pre-existing)
- [x] **Supabase storage driver** — `@tyravel/storage-supabase` with bucket config, upload/download, and signed URLs via the Supabase Storage API

## Tier 10 — Full-stack interactivity (v0.10.0)

Ship a complete server-rendered UI + real-time client story. Tyravel already renders `.tyr` on the server (`View.render`, `Response.html`) and broadcasts events over Socket.io / Pusher (`@tyravel/broadcasting`, `/broadcasting/auth`). Tier 6 P7 added experimental streaming layouts and `@island` hydration hooks — Tier 10 turns that foundation into a production full-stack path and adds a Laravel Echo–style browser client.

### Server-side rendering

Move from “render HTML strings in controllers” to a first-class SSR workflow with optional progressive enhancement.

#### P0 — Must ship

- [x] **SSR document shell** — `Response.ssr()` (or equivalent) wraps rendered views in a complete HTML document: `<head>` meta, `@vite` assets, and an injected hydration manifest script tag
- [x] **Hydration runtime** — `@tyravel/ssr` (or `@tyravel/views/client`) browser package that reads `data-tyr-island` markers and mounts island components from a client registry
- [x] **Island registry API** — `registerIsland('counter', Counter)` on the client; server `@island('counter', props)` maps to the same id
- [ ] **Promote SSR APIs to stable** — graduate `View.renderStream()`, `@stream` / `@endstream`, `@island`, and the hydration manifest from experimental (see [STABILITY.md](STABILITY.md))
- [x] **SSR reference example** — extend `examples/hello-world` (or add `examples/ssr`) with at least one hydrated island and a streaming layout section

#### P1 — Strong want

- [ ] **Streaming SSR middleware** — first-class chunked `Response` integration so `View.renderStream()` flushes early shell HTML without manual async iteration in every controller
- [x] **SSR test helpers** — assert rendered HTML *and* hydration manifest contents in `@tyravel/testing` (`assertIsland`, `assertHydrationManifest`)
- [ ] **`tyravel make:island`** — scaffold a paired server partial + client mount function with registry wiring

#### P2 — If scope allows

- [ ] **Island catalog** — extend `View.catalog()` with client-mount metadata for docs / IDE tooling
- [ ] **Programmatic SSR** — `.tyr.ts` views participate in the island registry without a separate client file

### Laravel Echo equivalent (`@tyravel/echo`)

Browser-side channel subscriptions that mirror the server broadcasting API. Server-side broadcasting ships in Tier 8; this tier adds the missing client half.

#### P0 — Must ship

- [x] **`@tyravel/echo` package** — TypeScript-first browser library published alongside core
- [x] **Channel API** — `echo.channel('orders')`, `echo.private('orders.${id}')`, `echo.join('chat')` with Laravel-compatible naming (`private-`, `presence-` prefixes)
- [x] **Event listeners** — `.listen('.OrderShipped', handler)` and `.stopListening()`; respect `broadcastAs()` dot-prefix convention
- [x] **Socket.io connector** — pairs with `@tyravel/broadcasting-socket-io` and Redis pub/sub; reads config from a small bootstrap snippet
- [x] **Pusher connector** — pairs with `@tyravel/broadcasting-pusher`; uses existing `/broadcasting/auth` endpoint for private/presence signing
- [x] **Auth transport** — cookie/session credentials on auth requests; CSRF token support for same-origin apps

#### P1 — Strong want

- [ ] **Presence events** — `.here()`, `.joining()`, `.leaving()`, `.error()` callbacks on presence channels
- [ ] **Scaffold integration** — `tyravel new` / layout stub emits an `@echo` or `@vite` companion script that bootstraps Echo from `config/broadcasting.ts` values safe for the client (key, host, driver)
- [ ] **Echo + views** — `@echo` directive or layout stack helper to load the Echo client bundle only on pages that need real-time updates

#### P2 — If scope allows

- [ ] **Typed channel events** — `EchoChannelEventMap` module augmentation for `.listen()` payload inference
- [ ] **Reconnection & offline** — connector lifecycle hooks (`connected`, `disconnected`, `reconnecting`) and queued listeners while offline

## Tier X — Production-ready project

Open-ended tier: done when Tyravel is a framework teams can adopt with confidence in production — not tied to a version number. Items land here when Tiers 1–7 are in place.

- [ ] **Hosted documentation** — public docs site (beyond in-repo VitePress)
- [ ] **tyravel-mcp** — agent-oriented capability index so models can build Tyravel apps without searching the whole codebase
- [ ] **Ecosystem guide** — how to publish and maintain third-party `@tyravel/*` packages

## Shipped in v0.1.0

- Service container, HTTP router, kernel, facades, CLI scaffolding
- Route groups, controllers, config, middleware, validation, Node `serve()`
- Eloquent-style ORM, views, queue/events
- Auth (session, tokens, OAuth, policies, password reset)
- `@tyravel/testing`, cache, mail (SMTP + queued), notifications (queued)