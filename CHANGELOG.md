# Changelog

All notable changes to Tyravel are documented in this file.

## [0.10.0] - 2026-06-24

### Added

- **Tier 10 — full-stack interactivity** — `@tyravel/ssr` hydration runtime, `@tyravel/echo` Laravel Echo-style client, and scaffold integration via `tyravel new`.
- **Streaming SSR** — `View.streamSsr()`, `Response.ssrStream()`, and `streamSsrDocument()` with chunked response flushing.
- **Islands** — `@island` directive, `View.catalog()`, `registerProgrammaticIsland()`, and `tyravel make:island [--programmatic]`.
- **Echo scaffold** — `@echo` views directive, `channels.ts` / `echo.ts` stubs, and `resolveEchoClientConfig`.
- **Echo presence** — `.here()`, `.joining()`, `.leaving()`, and `.error()` callbacks on presence channels; `EchoChannelEventMap` typing; `echo.connected()` / `disconnected()` / `reconnecting()` lifecycle hooks.
- **Auth security hardening** — Global CSRF middleware (HTTP 419), timing-safe password reset, `SESSION_SECURE` cookie support, token ability middleware, and `registerOAuthDriver()` for custom social providers.
- **API token hardening** — `tyr_` token prefix, `token_prefix` / `last_used_ip` / `revoked_at` / `ip_whitelist` columns, `Auth.createToken()` options (`expiresIn`, `ipWhitelist`), `Auth.revokeToken()` / `revokeAllTokens()`, and `request.tokenId` on bearer auth.
- **Social OAuth** — PKCE on all built-in providers; X, Facebook, LinkedIn, and Apple drivers; `tyravel make:social-driver`.
- **OAuth2 authorization server** — `@tyravel/auth-oauth` with authorization code (+ PKCE), client credentials, and refresh token grants; `tyravel oauth:install`, `tyravel oauth:client:create`, and `auth:oauth` middleware.
- **Post-quantum cryptography** — `@tyravel/crypto` with ML-KEM, ML-DSA, SLH-DSA, and hybrid X25519 + ML-KEM-768; native OpenSSL PQC when available, `@noble/post-quantum` fallback on Node 22.
- **Crypto integrations** — Optional AES-256-GCM session encryption at rest and ML-DSA signed OAuth access tokens; `tyravel crypto:install` and `tyravel crypto:generate-keys`.

### Changed

- **SSR and hydration APIs** — Promoted to stable (see `STABILITY.md`).











## [0.9.1] - 2026-06-24

See [v0.9.1 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.9.1).
## [0.9.0] - 2026-06-24

### Changed

- **Async-native platform (Tier 9)** — Public filesystem and boot paths now use `fs/promises` instead of blocking `node:fs` on runtime code paths. This includes config loading (`loadEnv`, config `readdir`), provider discovery, view template/cache I/O, and CLI scaffold/project discovery.
- **Queue defaults** — New apps and examples default to the `database` queue connection. The `sync` driver is no longer registered in `QueueManager` for production use (tests may still use `SyncQueue` directly).
- **`View.exists()`** — Returns `Promise<boolean>`; callers must `await`.
- **CLI project helpers** — `findProjectRoot()`, `loadProjectConfig()`, `requireProjectRoot()`, and `writeFile()` in `@tyravel/cli` are async.

### Deprecated (removed in 1.0.0)

| API | Replacement |
|-----|-------------|
| `loadEnvSync()` | `await loadEnv()` |
| `findProjectRootSync()` | `await findProjectRoot()` |
| `loadProjectConfigSync()` | `await loadProjectConfig()` |
| `requireProjectRootSync()` | `await requireProjectRoot()` |
| `writeFileSync()` (`@tyravel/cli` utils) | `await writeFile()` |
| `readCompiledCacheSync()` / `writeCompiledCacheSync()` / `clearCompiledCacheDirSync()` / `discoverViewNamesSync()` | Async counterparts in `@tyravel/views` |
| `sync` queue connection in app config | `database` or `redis` |

### Migration

- Add `await` to `View.exists()`, CLI `requireProjectRoot()`, and compiled-cache helpers if you call them directly.
- Feature tests that relied on `QUEUE_CONNECTION=sync` for inline queued listeners should use `database` (or `redis`) and drain the queue after dispatch — see `examples/hello-world/tests/support/reference-test-case.ts` (`drainQueue()`).
- Remove `sync: { driver: 'sync' }` from `config/queue.ts`; keep `database` and optional `redis` connections.

## [0.8.0] - 2026-06-22

See [v0.8.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.8.0).
## [0.7.0] - 2026-06-21

See [v0.7.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.7.0).
## [0.6.1] - 2026-06-21

See [v0.6.1 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.6.1).
## [0.6.0] - 2026-06-22

See [v0.6.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.6.0).
## [0.5.0] - 2026-06-21

See [v0.5.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.5.0).
## [0.4.0] - 2026-06-21

See [v0.4.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.4.0).
## [0.3.0] - 2026-06-21

See [v0.3.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.3.0).
## [0.2.1] - 2026-06-20

See [v0.2.1 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.2.1).
## [0.2.0] - 2026-06-20

See [v0.2.0 release notes](https://github.com/thesimonharms/tyravel/releases/tag/v0.2.0).
## [0.1.0] - 2026-06-20

First public release of the `@tyravel/*` monorepo.

### Added

- **Core** — Application kernel, HTTP kernel, service providers, facades (`Route`, `Config`, `DB`, `Queue`, `Events`, `Auth`, `Cache`, `Mail`, `Notifications`)
- **HTTP** — Router, route groups, middleware registry, Web API request/response types
- **Container** — Bindings, singletons, aliases, callable injection
- **Config** — Typed `config/*.ts` loading
- **Database** — Query builder, Eloquent-style models, relations, scopes, migrations
- **Validation** — Pipe rules and 422 validation responses
- **Views** — `.tyr` template compiler with layouts and components
- **Queue** — Sync and database drivers, job registry, worker, failed jobs
- **Events** — Dispatcher, listeners, queued listeners, event subscribers
- **Auth** — Session guard, API tokens, policies (`Gate`), password reset, OAuth providers, `auth:install`
- **Cache** — Array and file stores, `remember()`
- **Mail** — `Mailable`, log/array/SMTP transports, queued `SendMailable`
- **Notifications** — Mail and database channels, queued `SendQueuedNotification` (database queue default)
- **Testing** — `TestCase`, HTTP test client, Vitest integration, fakes
- **CLI** — `new`, `serve`, makers, `migrate`, `queue:work`, `auth:install`, and more

### Notes

- Requires **Node.js ≥ 22**
- New apps default to **database** queue with `jobs`, `failed_jobs`, and `notifications` migrations scaffolded

[0.1.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.1.0
[0.2.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.2.0
[0.2.1]: https://github.com/thesimonharms/tyravel/releases/tag/v0.2.1
[0.3.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.3.0
[0.4.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.4.0
[0.5.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.5.0
[0.6.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.6.0
[0.6.1]: https://github.com/thesimonharms/tyravel/releases/tag/v0.6.1
[0.7.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.7.0
[0.8.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.8.0
[0.9.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.9.0
[0.10.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.10.0
[0.9.1]: https://github.com/thesimonharms/tyravel/releases/tag/v0.9.1
