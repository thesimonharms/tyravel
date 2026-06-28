# Tyravel Roadmap

Post-v0.1.0 direction. v0.1 shipped the core Laravel-shaped stack; subsequent releases focus on polish, production adapters, and real-world ergonomics.

**v0.13.0 detour:** Tier 13 was originally AI-native work; it was repurposed for Node 26, native WebSocket realtime, and a lean dependency footprint. AI-native features move to Tier 14 (v0.14.0).

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

- [x] **Broadcasting** — real-time event broadcasting with dynamic channel authorization (originally Socket.io / Pusher drivers; superseded by native WebSocket in v0.13.0)
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

Ship a complete server-rendered UI + real-time client story. Tyravel already renders `.tyr` on the server (`View.render`, `Response.html`) and broadcasts events over WebSockets (`@tyravel/broadcasting`, `/broadcasting/auth`). Tier 6 P7 added experimental streaming layouts and `@island` hydration hooks — Tier 10 turns that foundation into a production full-stack path and adds a Laravel Echo–style browser client.

### Server-side rendering

Move from “render HTML strings in controllers” to a first-class SSR workflow with optional progressive enhancement.

#### P0 — Must ship

- [x] **SSR document shell** — `Response.ssr()` (or equivalent) wraps rendered views in a complete HTML document: `<head>` meta, `@vite` assets, and an injected hydration manifest script tag
- [x] **Hydration runtime** — `@tyravel/ssr` (or `@tyravel/views/client`) browser package that reads `data-tyr-island` markers and mounts island components from a client registry
- [x] **Island registry API** — `registerIsland('counter', Counter)` on the client; server `@island('counter', props)` maps to the same id
- [x] **Promote SSR APIs to stable** — graduate `View.renderStream()`, `@stream` / `@endstream`, `@island`, and the hydration manifest from experimental (see [STABILITY.md](STABILITY.md))
- [x] **SSR reference example** — extend `examples/hello-world` (or add `examples/ssr`) with at least one hydrated island and a streaming layout section

#### P1 — Strong want

- [x] **Streaming SSR middleware** — first-class chunked `Response` integration so `View.renderStream()` flushes early shell HTML without manual async iteration in every controller
- [x] **SSR test helpers** — assert rendered HTML *and* hydration manifest contents in `@tyravel/testing` (`assertIsland`, `assertHydrationManifest`)
- [x] **`tyravel make:island`** — scaffold a paired server partial + client mount function with registry wiring

#### P2 — If scope allows

- [x] **Island catalog** — extend `View.catalog()` with client-mount metadata for docs / IDE tooling
- [x] **Programmatic SSR** — `.tyr.ts` views participate in the island registry without a separate client file

### Laravel Echo equivalent (`@tyravel/echo`)

Browser-side channel subscriptions that mirror the server broadcasting API. Server-side broadcasting ships in Tier 8; this tier adds the missing client half.

#### P0 — Must ship

- [x] **`@tyravel/echo` package** — TypeScript-first browser library published alongside core
- [x] **Channel API** — `echo.channel('orders')`, `echo.private('orders.${id}')`, `echo.join('chat')` with Laravel-compatible naming (`private-`, `presence-` prefixes)
- [x] **Event listeners** — `.listen('.OrderShipped', handler)` and `.stopListening()`; respect `broadcastAs()` dot-prefix convention
- [x] **Socket.io connector** — shipped in v0.10.x; removed in v0.13.0 in favor of native WebSocket
- [x] **Pusher connector** — shipped in v0.10.x; removed in v0.13.0 in favor of native WebSocket
- [x] **Auth transport** — cookie/session credentials on auth requests; CSRF token support for same-origin apps

#### P1 — Strong want

- [x] **Presence events** — `.here()`, `.joining()`, `.leaving()`, `.error()` callbacks on presence channels
- [x] **Scaffold integration** — `tyravel new` / layout stub emits an `@echo` or `@vite` companion script that bootstraps Echo from `config/broadcasting.ts` values safe for the client (key, host, driver)
- [x] **Echo + views** — `@echo` directive or layout stack helper to load the Echo client bundle only on pages that need real-time updates

#### P2 — If scope allows

- [x] **Typed channel events** — `EchoChannelEventMap` module augmentation for `.listen()` payload inference
- [x] **Reconnection & offline** — connector lifecycle hooks (`connected`, `disconnected`, `reconnecting`) and queued listeners while offline

## Tier 11 — Security & identity (v0.11.0) ✓

Harden auth for production APIs and add OAuth2 server + post-quantum crypto primitives.

- [x] **Auth security hardening** — global CSRF middleware (HTTP 419), timing-safe password reset, `SESSION_SECURE` / `sameSite`, token ability middleware, `registerOAuthDriver()`
- [x] **API token hardening** — `tyr_` prefix, `token_prefix` / `last_used_ip` / `revoked_at` / `ip_whitelist`, `Auth.createToken()` options, revoke APIs, `request.tokenId`
- [x] **Social OAuth depth** — PKCE on built-in providers; X, Facebook, LinkedIn, Apple; `tyravel make:social-driver`
- [x] **OAuth2 authorization server** — `@tyravel/auth-oauth` (authorization code + PKCE, client credentials, refresh token); `oauth:install`, `oauth:client:create`, `auth:oauth` middleware
- [x] **Post-quantum cryptography** — `@tyravel/crypto` (ML-KEM, ML-DSA, SLH-DSA, hybrid X25519 + ML-KEM-768); native OpenSSL PQC on Node 26+ (no JS fallback)
- [x] **Crypto integrations** — optional AES-256-GCM session encryption at rest, ML-DSA signed OAuth tokens; `crypto:install`, `crypto:generate-keys`

## Tier 12 — Production ergonomics (v0.12.x) ✓

Make Tyravel comfortable for multi-locale teams, day-two operations, and optional back-office UIs. Builds on Tier 6 P5 view localization, Tier 7 health checks, and Tier 8 query profiling.

### Full localization

Tier 6 shipped `@lang` / `__()` and JSON locale files in views. v0.12 completes the stack across HTTP, validation, mail, and notifications.

#### P0 — Must ship

- [x] **Locale middleware** — `SetLocale` reads `Accept-Language`, session, or user preference; exposes active locale on the request
- [x] **Fallback locale chain** — `config/app.ts` `locale`, `fallback_locale`, and optional `faker_locale` for factories
- [x] **Nested keys + pluralization** — `trans('messages.items', { count: 3 })` with ICU-style plural rules in JSON/TS locale files
- [x] **Framework message catalogs** — translated validation, auth, and pagination strings out of the box
- [x] **Cross-channel translation** — `__()` in mail, notifications, and queued job payloads; locale passed through `Mailable` / `Notification`

#### P1 — Strong want

- [x] **Per-user locale** — store preference on the user model; middleware resolves authenticated locale
- [x] **Date/number/currency formatting** — `formatDate()`, `formatNumber()`, `formatCurrency()` helpers wired to active locale
- [x] **Localized route prefixes** — optional `/{locale}/…` route group with `URL::defaults(['locale' => …])` style helpers
- [x] **`tyravel lang:publish` / `lang:missing`** — scaffold locale files and report untranslated keys in CI

### Optional admin panel

Ship as an **optional** package (`@tyravel/admin`) — not a required core dependency. Goal: CRUD back-office for internal tools, not a Filament competitor.

#### P0 — Must ship

- [x] **`tyravel admin:install`** — opt-in routes, layout, auth gate (`can:access-admin` or config), and `.tyr` resource views
- [x] **Resource CRUD** — list / show / create / edit / delete generated from Eloquent-style models
- [x] **Filters, search, and pagination** — query-builder-driven index tables
- [x] **Policy integration** — respect `@tyravel/auth` policies on admin actions

#### P1 — Strong want

- [x] **Relation fields** — belongs-to selects, has-many inline tables on edit forms
- [x] **Bulk actions** — delete / export selected rows
- [x] **Dashboard stub** — health summary, queue depth, recent failed jobs

#### P2 — If scope allows

- [x] **Custom field types** — datetime, JSON, file upload via storage disk
- [x] **Audit log** — who changed what on admin-managed records

### Advanced monitoring & debugging

Laravel Telescope / Debugbar–shaped DX, TypeScript-native. Builds on `HealthChecker`, `QueryProfiler`, and the debug exception handler.

#### P0 — Must ship

- [x] **`@tyravel/debug` package** — request timeline: HTTP, queries, cache, queue dispatches, broadcasts, mail/notifications
- [x] **Dev debug bar** — middleware injects collapsible toolbar (or `/__debug` JSON panel) gated to `APP_DEBUG`
- [x] **Slow query + N+1 warnings** — threshold config; surface in debug bar and structured logs
- [x] **`tyravel debug:clear`** — prune stored debug entries

#### P1 — Strong want

- [x] **Request replay metadata** — copy curl / fetch snippet from debug entry
- [x] **OpenTelemetry exporter** — optional OTEL span export for production (no debug bar)
- [x] **Broadcasting scaffold fix** — channel rules use full `private-` / `presence-` prefixes to match Echo auth payloads

#### P2 — If scope allows

- [x] **Job / event timeline** — correlate queued work with the HTTP request that dispatched it
- [x] **`tyravel debug:watch`** — tail recent entries during `tyravel serve`

## Tier 13 — Native stack & lean dependencies (v0.13.0)

**Detour from the original plan** — Tier 13 was slated for AI-native features; v0.13.0 instead hardens the Node 26 bet and removes third-party realtime / PQC fallbacks so a vanilla install stays almost dependency-free.

### Runtime & crypto

- [x] **Node 26 minimum** — `engines`, CI, release workflow, and `pretest` guard; native `node:sqlite`, WebSocket, and OpenSSL PQC
- [x] **Native PQC only** — `@tyravel/crypto` uses OpenSSL exclusively; removed `@noble/post-quantum` (started in v0.12.1, completed for v0.13.0)

### Native realtime

- [x] **`@tyravel/broadcasting-websocket`** — RFC 6455 framing, in-process hub, Redis pub/sub fan-out; upgrade path `/tyravel/ws`
- [x] **WebSocket broadcast driver** — replaces Socket.io and Pusher server drivers; channel auth tokens compatible with `/broadcasting/auth`
- [x] **`WebSocketConnector` in `@tyravel/echo`** — browser/native `WebSocket`; zero peer dependencies (no `socket.io-client`, no `pusher-js`)
- [x] **Removed legacy drivers** — `@tyravel/broadcasting-socket-io` and `@tyravel/broadcasting-pusher` dropped from the monorepo and release train
- [x] **Scaffold updates** — `tyravel new --redis` installs `@tyravel/broadcasting-websocket` only; Echo bootstrap is `new Echo(config)` with no IO factory wiring

### Supply chain

- [x] **Five optional third-party production deps** — entire monorepo: `pg`, `mysql2`, `redis`, and two AWS SDK packages; everything else is `@tyravel/*`
- [x] **Default app footprint** — SQLite + database queue + log mail ships with no external production npm dependencies beyond Tyravel packages

## Tier 14 — AI-native platform (v0.14.0)

First-class vector search, RAG workflows, and agent tooling. **No unified LLM provider interface** — apps use native TypeScript SDKs (`openai`, `@anthropic-ai/sdk`, etc.) directly; Tyravel focuses on data layer, retrieval, orchestration, and MCP.

### Vector database

#### P0 — Must ship

- [x] **`@tyravel/vector` package** — embedding storage and similarity search API
- [x] **pgvector driver** — `vector` column blueprint, migration helper, cosine / L2 / inner-product operators via `@tyravel/database-pg`
- [x] **`VectorSearch` query API** — `Model.similarTo(embedding, { limit, threshold })` and `scopeNearest()` on query builder
- [x] **Chunk + embed pipeline** — `tyravel vector:embed` command; queue-backed batch embedding jobs

#### P1 — Strong want

- [x] **SQLite vec / in-memory driver** — local dev and tests without Postgres
- [x] **Hybrid search** — combine vector similarity with full-text / `where` filters
- [x] **Metadata filters** — JSON column predicates alongside vector distance

#### P2 — If scope allows

- [x] **Qdrant / Pinecone adapters** — external vector store drivers for apps that outgrow pgvector
- [x] **Embedding cache** — deduplicate embed calls via `@tyravel/cache`

### RAG

#### P0 — Must ship

- [x] **Document ingestion** — load plain text, markdown, and PDF into chunked records with source attribution
- [x] **Retrieval helper** — `Rag.retrieve(query, { topK, minScore })` returns ranked chunks ready for prompt assembly
- [x] **Prompt templates** — `.tyr` or TS templates for grounded Q&A with citation placeholders
- [x] **Example app** — `examples/rag` with ingest → embed → ask flow using a native SDK in the app layer

#### P1 — Strong want

- [x] **Conversation memory** — session-scoped message history stored in database
- [x] **Re-ranking step** — optional second-pass scoring hook before prompt injection
- [x] **Streaming responses** — SSE / chunked `Response` integration for token streams from app-level SDK calls

### MCP & agent ergonomics

#### P0 — Must ship

- [x] **`tyravel-mcp` package** — MCP server exposing framework capabilities: routes, models, config keys, artisan commands, and docs index
- [x] **Capability manifest** — machine-readable index of facades, CLI commands, and stable package exports (feeds agents and IDE tooling)
- [x] **`tyravel make:tool`** — scaffold MCP tool handlers that call app services

#### P1 — Strong want

- [x] **Agent-safe scaffolds** — `tyravel make:rag-resource` pairs model + vector migration + ingest job
- [x] **Prompt stubs in CLI** — `tyravel new --ai` adds RAG example routes and vector config

#### P2 — If scope allows

- [x] **Cursor / Claude Code rules export** — generate project-specific agent rules from the capability manifest

## Tier 15 — Infrastructure depth (v0.15.0)

Deepen cache, notifications, and testing beyond the v0.1 foundations (`@tyravel/cache`, `@tyravel/notifications`, `@tyravel/testing`). Production polish, not greenfield packages.

### Cache

#### P0 — Must ship

- [x] **Taggable cache** — `Cache.tags(['posts', 'user:1']).flush()` across drivers that support it
- [x] **Cache events** — `cache:hit`, `cache:miss`, `cache:write` hooks for debug bar and metrics
- [x] **Memcached driver** — `@tyravel/cache-memcached` production adapter
- [x] **HTTP cache headers** — middleware for `ETag`, `Cache-Control`, and `304` short-circuit on safe routes

#### P1 — Strong want

- [x] **Stampede protection** — `Cache::remember()` lock wrapper (extends existing cache-lock primitive)
- [x] **DynamoDB / Upstash drivers** — serverless-friendly cache backends
- [x] **Redis cluster / sentinel config** — connection options on `@tyravel/cache` Redis store

#### P2 — If scope allows

- [x] **Response cache middleware** — full-page cache for anonymous GET routes
- [x] **Model attribute caching** — opt-in `remember()` on expensive computed attributes

### Notifications

#### P0 — Must ship

- [x] **Slack + webhook channels** — first-party notification drivers beyond mail and database
- [x] **Notification batching** — `Notification::sendNow()` vs queued; batch digest notifications
- [x] **Failed notification handling** — dead-letter queue entry + `tyravel notification:retry`

#### P1 — Strong want

- [x] **Database notification UI helpers** — mark read / unread, pagination helpers for in-app bell
- [x] **Broadcast notification channel** — push real-time notification events over Echo
- [x] **SMS driver stub** — Twilio-compatible adapter pattern in docs + example

### Testing helpers

#### P0 — Must ship

- [x] **Mail / notification fakes** — `Mail.fake()`, `Notification.fake()` with assertion helpers
- [x] **Broadcast fake** — assert events dispatched to channels without a socket server
- [x] **Database transactions per test** — automatic `begin` / `rollback` wrapper in `@tyravel/testing`
- [x] **Time travel** — `travel(2).days()` for testing scheduled jobs and token expiry

#### P1 — Strong want

- [x] **HTTP test sugar** — `actingAs(user)`, `withSession()`, `withCsrf()` on test client
- [x] **Factory relationships** — `UserFactory.withPosts(3)` style nested factory states
- [x] **Snapshot assertions** — JSON and HTML snapshot helpers with stable diff output

#### P2 — If scope allows

- [x] **Parallel test runner docs** — vitest workspace guidance for large Tyravel apps
- [x] **Pest-style API** — optional thin wrapper for describe/it ergonomics (not a hard dependency)

## Tier 16 — Core surface polish (v0.16.0) ✓

Final API pass on the three surfaces developers touch daily — models, routes, and views — before the 1.0 stability freeze.

### Models

#### P0 — Must ship

- [x] **Route model binding** — implicit `{post}` resolution with 404 on missing records; explicit `Route.bind()` customization
- [x] **API resources maturity** — nested resources, conditional attributes, pagination meta; promote to stable in `STABILITY.md`
- [x] **Global scopes** — `Model.addGlobalScope()` / `withoutGlobalScope()` with soft-delete integration
- [x] **Custom cast authoring** — documented `Cast` interface for project-specific types

#### P1 — Strong want

- [x] **Prunable models** — `tyravel model:prune` for models with `prunable()` definition
- [x] **Model:uuid / ulid** — trait + migration helper for non-incrementing keys
- [x] **Lazy loading prevention** — dev-mode exception on unguarded relation access (opt-in)

### Routes

#### P0 — Must ship

- [x] **Named route URL generation** — `route('posts.show', { post: 1 })` with type-safe params where possible
- [x] **Signed URLs** — `URL.signed()` / `URL.temporarySigned()` for expiring links
- [x] **Route caching** — `tyravel route:cache` / `route:clear` for production boot performance
- [x] **Improved `route:list`** — filters by middleware, domain, and controller; JSON output for tooling

#### P1 — Strong want

- [x] **Route groups in TypeScript** — `Route.group({ prefix, middleware }, () => { … })` with inferred name prefixes
- [x] **Rate limit per route** — fluent `->throttle('api')` on individual routes
- [x] **`tyravel make:controller --api`** — invokable + resource controller scaffolds aligned with binding

### Views

#### P0 — Must ship

- [x] **Component props inference** — generated or hand-authored prop types flow into `@props` and `View.render<T>()`
- [x] **Stricter `view:lint` defaults** — unclosed directives and missing components fail CI in strict mode
- [x] **Production compile defaults** — `compiled: true` enforced in production boot with clear error when cache is cold

#### P1 — Strong want

- [x] **View component docs export** — `tyravel view:catalog --json` for design-system tooling
- [x] **Partial reload helpers** — Turbo/HTMX-friendly fragment response helpers building on `@fragment`
- [x] **Broadcast channel scaffold** — `routes/channels.ts` uses `private-` prefix patterns matching Echo

### v0.16 closeout

- [x] **Stable API audit** — every public export in `STABILITY.md` reviewed; experimental items promoted or cut
- [x] **Deprecation sweep** — remove deprecated APIs slated for 1.0; document migration in CHANGELOG
- [x] **0.x → 1.0 migration guide** — in-repo guide for upgrading apps on 0.11–0.16

## v1.0.0 — Documentation & semver strict

Tyravel **1.0.0** is the first semver-strict era (see [STABILITY.md](STABILITY.md)). Feature work for 1.0 lands in Tiers 12–16; **1.0 itself is the full documentation release**.

### Documentation (primary 1.0 deliverable)

- [x] **In-repo documentation system** — VitePress guide + reference + tutorials + cookbook; `npm run docs:generate` for package/CLI manifests; GitHub Pages workflow (`.github/workflows/docs.yml`)
- [x] **Hosted documentation site (workflow)** — GitHub Pages deploy (`.github/workflows/docs.yml`); `docs/public/CNAME` for tyravel.dev
- [x] **Hosted documentation site (live)** — GitHub Pages enabled (`build_type: workflow`); Docs workflow deploys on push to `main`; interim URL https://thesimonharms.github.io/tyravel/
- [x] **Custom domain (tyravel.dev)** — DNS pointed at GitHub Pages; HTTPS live at https://tyravel.dev
- [x] **Package & CLI reference (generated)** — every `@tyravel/*` package with exports table; full `tyravel` command list from `@tyravel/cli`
- [x] **Configuration reference** — `docs/guide/configuration-reference.md` for scaffold config keys and env vars
- [x] **Complete package reference** — facade method tables in generated reference (`docs/reference/generated/facades.md`); per-package exports remain auto-generated
- [x] **Tutorial track (scaffold)** — zero-to-deploy outline: install → auth → queue → realtime/deploy (`docs/tutorials/`)
- [x] **Tutorial track (verified links)** — hello-world feature tests cited for steps 1–3; broadcasting guide for step 4
- [x] **Tutorial track (complete)** — deploy provider walkthroughs (Fly, Railway, Docker) with copy-paste manifests in `examples/hello-world/deploy/` and `docs/guide/deployment/`
- [x] **Cookbook (core recipes)** — realtime Echo, RAG Q&A, testing fakes, admin panel, multi-locale (`docs/cookbook/`)
- [x] **Cookbook (complete)** — observability and multi-tenant recipes (`docs/cookbook/observability.md`, `docs/cookbook/multi-tenant.md`)
- [x] **Ecosystem guide** — `docs/guide/ecosystem.md` for third-party package authors
- [x] **Broadcasting guide** — `docs/guide/broadcasting.md` (deploy, Echo, channels)

### 1.0 gate

- [x] **No experimental APIs in core facades** — `View.catalog()` / `View.islandCatalog()` promoted to stable; programmatic `.tyr.ts`, `tyravel shell`, and `Bus` conventions remain experimental (non-facade)
- [x] **LTS support policy** — documented in `STABILITY.md` (6-month security window on previous minor)
- [x] **Security disclosure process** — `SECURITY.md` with reporting instructions

## Tier 17 — Performance & ecosystem (v1.1.0)

First post-1.0 minor. Focus on measurable throughput, community extensibility, and closing the remaining v1.0 ops gap.

### Performance benchmarks

#### P0 — Must ship

- [x] **Benchmark harness** — `npm run benchmark` measures HTTP JSON, ORM select, and view compile throughput (`scripts/benchmark.mjs`)
- [x] **Benchmark guide** — `docs/guide/benchmarks.md` documents how to run and interpret baselines

#### P1 — Strong want

- [x] **CI benchmark job** — `.github/workflows/benchmarks.yml` on `main`; JSON artifact per commit
- [x] **Regression notes** — expected quick-mode ranges for Node 26 on Linux CI in `docs/guide/benchmarks.md`

#### P2 — If scope allows

- [ ] **Hello-world route bench** — moved to Tier 19 (full-stack SSR benchmark)

### Built-in OAuth providers

#### P1 — Strong want

- [x] **Additional social providers** — GitLab, Slack, Spotify, Twitch, and Bitbucket drivers in `@tyravel/auth`
- [x] **Self-hosted GitLab** — optional `baseUrl` config for non-gitlab.com instances

### v1.0 ops closeout

- [x] **Custom domain (tyravel.dev)** — DNS and HTTPS verified; live at https://tyravel.dev

### Production DevOps (v1.1 polish)

#### P1 — Strong want

- [x] **`tyravel start`** — production server command (no view watcher; hides `--experimental-strip-types`)
- [x] **Deploy scaffold** — `deploy/` directory (Docker, Compose, Fly, Railway) on `tyravel new`
- [x] **CLI in production deps** — `@tyravel/cli` moved to `dependencies` for container `npm ci --omit=dev`
- [x] **Health probe split** — `/health/live` (liveness) and `/health/ready` (readiness) in `HealthServiceProvider`
- [x] **Deploy docs & manifests** — `npx tyravel start|migrate|queue:work` across guides and `examples/hello-world/deploy/`

## Tier 18 — Developer experience (v1.2.0)

Make Tyravel feel as smooth on day one as Laravel does: fast local iteration, obvious errors, and tooling that stays out of the way until you need it. Builds on Tier 5 (magic DX), Tier 12 (debug bar), and Tier 17 (production commands).

### Local development loop

#### P0 — Must ship

- [x] **`tyravel dev` alias** — single entry for `serve` + `debug:watch` hints; document the canonical local workflow in the tutorial
- [x] **Config/route hot reload** — reload `config/*.ts` and route files on change during `tyravel serve` without full process restart (views already watch via `TYRAVEL_VIEW_WATCH`)
- [x] **Runtime transparency** — `tyravel serve` prints which runtime is active (Node strip-types vs Bun) and links to troubleshooting when Node is below 26

#### P1 — Strong want

- [x] **Queue worker in dev** — `tyravel dev --queue` or `npm run dev:worker` script in scaffold; docs for mail/event testing without a second terminal guess
- [x] **`.env` validation on boot** — fail fast with actionable messages when required env vars for the active `DB_CONNECTION`, `QUEUE_CONNECTION`, or OAuth providers are missing
- [x] **First-run checklist** — post-`tyravel new` output: migrate, serve, test, optional `auth:install` — with copy-paste commands per scaffold flags

#### P2 — If scope allows

- [x] **HTTPS local dev** — optional `tyravel serve --tls` with generated certs for OAuth redirect testing
- [x] **Concurrent dev processes** — `tyravel dev` spawns web + queue worker + `debug:watch` with one Ctrl+C shutdown

### Experimental → stable

#### P0 — Must ship

- [x] **Stable `tyravel shell`** — graduate `@tyravel/repl` and document supported REPL APIs; compatibility tests for facade imports and model autoload
- [x] **Stable programmatic `.tyr.ts` views** — lock island mount contract; document in views guide with a reference example

#### P1 — Strong want

- [x] **Stable `Bus` conventions** — document auto-discovery naming and promote to stable in `STABILITY.md`, or extract an explicit `Bus.register()` API
- [x] **Shell ergonomics** — `.routes`, `.models`, and `await User.find(1)`-style helpers in REPL; history persists across sessions (already on disk — document and test)

### Scaffolding & onboarding

#### P0 — Must ship

- [x] **`npm create tyravel@latest`** — `create-tyravel` package wrapping `tyravel new` with interactive prompts (db, redis, auth, ai)
- [x] **Stack templates** — `tyravel new --template=api|ssr|saas` presets for routes, config, and example features

#### P1 — Strong want

- [x] **Migrating from Laravel guide** — mental-model map (routes, Eloquent, Blade → `.tyr`, Artisan → CLI) in `docs/guide/migrating-from-laravel.md`
- [x] **SaaS starter example** — forkable app under `examples/` with auth, admin, queue, and deploy manifests (complements hello-world + rag)
- [x] **VS Code / Cursor extension stub** — `.tyr` syntax highlighting, snippet pack, and link to `tyravel view:types` generated props

#### P2 — If scope allows

- [x] **Interactive `tyravel new`** — TUI when no flags passed (database, redis, auth) instead of requiring full flag list
- [x] **Headless API template (planning)** — `tyravel new --headless` / `--template=headless` option on roadmap; first-class backend-only scaffold ships in Tier 19

### Diagnostics & errors

#### P0 — Must ship

- [x] **`tyravel doctor`** — checks Node version, writable `storage/`, database connectivity, Redis when configured, compiled view cache in production, and OAuth redirect URI shape
- [x] **Actionable exceptions** — link common boot failures (`CompiledViewCacheMissError`, missing provider, bad `.env`) to docs URLs in the error message

#### P1 — Strong want

- [x] **Pre-deploy command** — `tyravel deploy:check` runs doctor + `route:cache` dry-run + `view:cache` validation; CI-friendly exit codes
- [x] **Debug bar deep links** — request id in toolbar links to `/__debug?correlation=` JSON for the current entry
- [x] **N+1 source maps** — show file:line of the query origin in slow-query warnings when `APP_DEBUG=true`

#### P2 — If scope allows

- [x] **Benchmark in doctor** — optional quick `BENCHMARK_QUICK=1` smoke when `--perf` flag passed

### Views & typing DX

#### P1 — Strong want

- [x] **`tyravel view:types` in CI** — scaffold GitHub Action snippet; fail PR when component props drift from `.tyr` signatures
- [x] **View catalog IDE export** — `tyravel view:catalog --ide=vscode` emits JSON for extension consumption
- [x] **Stricter dev defaults** — `view:lint` recommended in `precommit` stub; `--strict` documented for team adoption

#### P2 — If scope allows

- [x] **`.tyr` language server** — basic LSP: go-to-component, prop completion from `ViewPropsMap`, `@include` path validation

### Testing DX

#### P1 — Strong want

- [x] **`tyravel test` wrapper** — delegates to vitest with project config; sets `APP_ENV=testing` consistently
- [x] **HTTP test recipes** — expand `@tyravel/testing` docs for OAuth, broadcasting, and partial reload assertions with copy-paste examples
- [x] **In-memory SQLite default** — testing guide recommends `:memory:` per worker; document parallel vitest workspace setup (extends Tier 15 P2 docs)

#### P2 — If scope allows

- [x] **Feature test generator defaults** — `make:test --feature` scaffolds `actingAs`, CSRF, and database refresh hooks when auth is installed

## Tier 19 — Speed & snappiness (v1.3.0)

Make Tyravel feel **fast by default**: low cold-start latency, high request throughput, and instant feedback in dev. Builds on Tier 17 benchmarks, Tier 15 response/model caching, and Tier 16 route/view compile caches. Success is measurable — higher benchmark baselines, lower p95 in real apps, and fewer “why is boot slow?” surprises.

### Headless API mode

First-class backend-only Tyravel: JSON APIs without views, SSR, Echo, or client assets. Planned in Tier 18; ships here as a stable scaffold and tooling path.

#### P0 — Must ship

- [x] **`tyravel new --headless`** — slim `package.json`, `src/routes/api.ts`, `config/app.ts` with `headless: true`, `tyravel.json` `mode: "headless"`
- [x] **Headless-aware CLI** — `doctor` skips view-cache checks; `deploy:check` skips view compilation; `tyravel dev` omits view watch; `auth:install` uses API routes
- [x] **Headless guide** — `docs/guide/headless.md` with quick start, auth, deploy, and conversion notes

#### P1 — Strong want

- [x] **Headless example app** — `examples/headless-api` with auth tokens, queue worker, and deploy manifests
- [x] **`npm create tyravel@latest -- --headless`** — document in getting-started and create-tyravel README
- [x] **Headless boot profile** — `applyBootProfile()` + JSON errors by default; `registerViewStack()` helper when not headless

#### P2 — If scope allows

- [x] **OpenAPI stub** — `tyravel make:openapi` exports OpenAPI 3.0 from registered routes

### HTTP request hot path

#### P0 — Must ship

- [ ] **JSON response fast path** — bypass unnecessary middleware and body parsing on simple `Response.json()` API routes when no session/CSRF is required
- [x] **Route cache at boot** — `prepareHttpServer()` validates and warms `storage/framework/routes.json` in production
- [x] **Middleware resolution cache** — `MiddlewareRegistry` caches resolved alias middleware per worker

#### P1 — Strong want

- [x] **Keep-alive tuning** — Node adapter defaults `keepAliveTimeout` / `headersTimeout` for reverse-proxy deployments
- [ ] **Request object pooling** — reuse or slim `TyravelRequest` construction for high-throughput JSON endpoints (behind benchmark proof)
- [ ] **Early 404 short-circuit** — unmatched routes exit before session/database providers when `APP_DEBUG=false`

#### P2 — If scope allows

- [ ] **HTTP/2 opt-in** — `serve({ http2: true })` for TLS-terminated local benchmarks and HTTP/2-aware load balancers
- [ ] **`tyravel start --cluster`** — `node:cluster` worker fork mode with shared route/view caches and Redis session store

### Boot & cold start

#### P0 — Must ship

- [x] **Production boot profile** — `prepareHttpServer()` skips hot reload in production; route cache warm at boot
- [ ] **Compiled view preload** — optional eager load of `view:cache` manifest into memory on boot (`config/views.ts` `preloadCompiled: true`)
- [x] **Boot time benchmark** — `scripts/benchmark.mjs` includes `boot.cold` (Application → serve listen)

#### P1 — Strong want

- [ ] **Config manifest cache** — `tyravel config:cache` serializes merged config for production boot (mirrors route cache workflow)
- [ ] **Lazy provider registration** — defer `@tyravel/admin`, `@tyravel/debug`, and MCP providers until first use or explicit route hit
- [ ] **Database pool warm-up** — fire-and-forget `SELECT 1` during boot when `DB_POOL_WARMUP=true` (default on in production scaffold)

#### P2 — If scope allows

- [ ] **Single-file production bundle** — optional `tyravel build` esbuild bundle for edge deploys (Fly Machines, Lambda-style) with documented trade-offs

### Views & SSR throughput

#### P0 — Must ship

- [ ] **Runtime compiled cache (LRU)** — in-memory hit layer above on-disk compiled views; eliminates repeated disk I/O per request in production
- [ ] **Hello-world route bench** — full-stack benchmark: SSR `welcome.tyr` through real `HttpKernel` (carried from Tier 17 P2)
- [ ] **Render benchmark** — `view.render` throughput (not just `compile`) in `npm run benchmark`

#### P1 — Strong want

- [ ] **Skip empty hydration manifest** — omit hydration `<script>` payload when the rendered tree has no `@island` markers
- [ ] **Streaming shell flush** — guarantee first HTML chunk (layout `<head>` + CSS links) within N ms of handler start for `Response.ssrStream()`
- [ ] **Component render memoization** — opt-in `@@memo` or cache keyed by props hash for expensive pure components

#### P2 — If scope allows

- [ ] **Worker-thread view compile** — parallelize `view:cache` across CPU cores for large view catalogs

### ORM & database speed

#### P1 — Strong want

- [ ] **Prepared statement cache** — per-connection statement cache for repeated `Model` queries (SQLite, Postgres, MySQL)
- [ ] **`Model.all()` column pruning** — `Model.select(['id', 'title'])` avoids hydrating unused attributes; benchmark against wide tables
- [ ] **SQLite WAL default** — enable WAL journal mode for file-backed SQLite in production scaffold (document concurrent read wins)
- [ ] **Pool sizing guide** — Postgres/MySQL connection pool defaults and env vars (`DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT`) with fly/railway examples

#### P2 — If scope allows

- [ ] **Read/query result cache** — opt-in `Model.remember()` on expensive aggregate queries (extends Tier 15 model attribute caching)
- [ ] **Batch insert helper** — `Model.insertMany()` for seeders and ingest jobs without N round-trips

### Caching & perceived speed

#### P1 — Strong want

- [ ] **Production cache defaults** — scaffold `config/cache.ts` documents `remember()` on hot read paths; HTTP cache middleware on safe public GET routes
- [ ] **Partial reload cookbook** — HTMX/Turbo patterns with `Response.partial()` for sub-100ms UI updates without full page reload
- [ ] **SSR asset preload** — `@vite` / layout stack emits `<link rel="modulepreload">` for critical client bundles

#### P2 — If scope allows

- [ ] **Edge response cache** — integration notes for Cloudflare/Fly replay cache keyed on `ETag` middleware (Tier 15 shipped ETag support)

### Benchmarks & regression gates

#### P0 — Must ship

- [ ] **Expanded benchmark suite** — add `middleware.stack`, `session.auth`, and `view.render` scenarios to `scripts/benchmark.mjs` (`middleware.stack` + `boot.cold` shipped; `session.auth` + `view.render` open)
- [ ] **Benchmark regression comment** — CI job compares quick-mode JSON to previous `main` artifact; warns on >15% drop (non-blocking)

#### P1 — Strong want

- [ ] **Weekly full benchmark workflow** — scheduled `BENCHMARK_QUICK=0` run on `main`; longer retention for trend charts
- [ ] **Public perf page** — `tyravel.dev/guide/benchmarks` section with latest CI numbers and historical graph (manual or generated)
- [ ] **Bun vs Node comparison** — document relative throughput when running on Bun for dev and production

#### P2 — If scope allows

- [ ] **Opt-in perf budget in apps** — `tyravel test --perf` fails when app-specific benchmark thresholds regress (user-defined in `tyravel.json`)

### Speed documentation

#### P1 — Strong want

- [ ] **Performance guide** — `docs/guide/performance.md`: boot checklist, cache warm-up, pool sizing, when to use Redis, anti-patterns (N+1, uncached views)
- [ ] **Snappy defaults changelog** — each speed tier item notes the measurable before/after in release notes

## Tier X — Ongoing

Items not tied to a version number. Land when useful; do not block releases.

- [x] **Additional OAuth / social providers** — GitLab, Slack, Spotify, Twitch, Bitbucket built-ins (Tier 17)
- [x] **Native WebSocket broadcasting guide** — proxy, Redis fan-out, and Echo setup in `docs/guide/broadcasting.md`
- [x] **Performance benchmarks** — harness, guide, and CI trend job shipped in Tier 17
- [x] **Developer experience (Tier 18)** — v1.2.0 complete (P0+P1+P2): `dev` concurrent workers, `--tls`, `doctor --perf`, `make:test --feature`, `.tyr` LSP stub, interactive `tyravel new`
- [ ] **Speed & snappiness (Tier 19)** — HTTP hot path, boot time, view/ORM throughput, benchmark regression gates; target v1.3.0

## Shipped in v0.1.0

- Service container, HTTP router, kernel, facades, CLI scaffolding
- Route groups, controllers, config, middleware, validation, Node `serve()`
- Eloquent-style ORM, views, queue/events
- Auth (session, tokens, OAuth, policies, password reset)
- `@tyravel/testing`, cache, mail (SMTP + queued), notifications (queued)