# Changelog

All notable changes to Tyravel are documented in this file.

## [0.14.0] - 2026-06-25

### Added

- **Vector search** — New `@tyravel/vector` package with `similarTo()`, `Model.similarTo()`, `query().scopeNearest()`, chunk embedding jobs, hybrid text+vector search, metadata filters, and optional embedding cache via `@tyravel/cache`.
- **Vector drivers** — `@tyravel/vector-pg` (pgvector), `@tyravel/vector-qdrant`, and `@tyravel/vector-pinecone` fetch-based drivers with zero extra npm dependencies beyond the opt-in package.
- **RAG** — `@tyravel/rag` with document ingestion (txt/md/pdf), grounded prompt templates, `ConversationMemory`, reranking hooks, and `streamRagResponse()` for retrieval-augmented generation flows.
- **MCP server** — `@tyravel/mcp` exposes framework capabilities to AI agents; `tyravel mcp:serve` and `tyravel mcp:export-rules` scaffold Cursor/Claude agent rules from the capability manifest.
- **GraphQL** — `@tyravel/graphql` zero-dependency GraphQL server with programmatic TypeScript schema, persisted operations, minimal query parsing, and operation/field-level caching via `@tyravel/cache`.
- **SSE responses** — `Response.sse()` in `@tyravel/http` for streaming event payloads (used by RAG streaming routes).
- **AI project scaffold** — `tyravel new --ai` generates vector config, embed stub, Document/ConversationMessage models, RAG routes, and GraphQL endpoint wiring.
- **CLI generators** — `tyravel vector:embed`, `tyravel vector:install`, `tyravel make:rag-resource`, and `tyravel make:tool`.
- **Database vector columns** — Blueprint `vector()` column helper and model query builder extensions for nearest-neighbor scopes.
- **RAG example** — `examples/rag` demonstrates ingest → embed → ask → stream with GraphQL read API at `/graphql`.

### Changed

- **Release train** — `@tyravel/vector`, `@tyravel/vector-pg`, `@tyravel/vector-qdrant`, `@tyravel/vector-pinecone`, `@tyravel/rag`, `@tyravel/graphql`, and `@tyravel/mcp` join the npm publish list.

## [0.13.0] - 2026-06-25

### Added

- **Native WebSocket broadcasting** — New `@tyravel/broadcasting-websocket` package with RFC 6455 framing, an in-process hub at `/tyravel/ws`, and Redis pub/sub fan-out on `tyravel:broadcast`.
- **WebSocket broadcast driver** — `driver: 'websocket'` in `config/broadcasting.ts`; channel auth tokens remain compatible with `/broadcasting/auth`.
- **Native Echo connector** — `WebSocketConnector` in `@tyravel/echo` uses the browser/native `WebSocket` API with reconnect lifecycle hooks; no third-party realtime client libraries.
- **Redis subscribe** — `@tyravel/redis-node` implements `subscribe()` via a duplicated `node-redis` connection for broadcast fan-out.
- **Node version guard** — `scripts/check-node.mjs` runs before `npm test` and `npm run typecheck`; root `engines.node` is `>=26` with `engine-strict` enabled.

### Changed

- **Lean default install** — A vanilla `tyravel new` app (SQLite, database queue, log mail) ships with no external production npm dependencies beyond `@tyravel/*` packages. The entire monorepo has five optional third-party production deps (`pg`, `mysql2`, `redis`, two AWS SDK packages), each behind an opt-in driver package.
- **Broadcasting scaffold** — `tyravel new --redis` installs `@tyravel/broadcasting-websocket` instead of `@tyravel/broadcasting-socket-io`; `BROADCAST_CONNECTION` defaults to `websocket`; Echo bootstrap is `new Echo(config)` with no `socket.io-client` factory wiring.
- **Echo client config** — `resolveEchoClientConfig()` and view bootstrap emit `broadcaster: 'websocket'` with `host` and `path` (no Pusher key/cluster).
- **HTTP server** — `@tyravel/core` attaches the broadcast WebSocket upgrade handler during `serve()` on Node.
- **Release CI** — GitHub Actions release workflow now uses Node.js 26 (matching CI).

### Removed

- **`@tyravel/broadcasting-socket-io`** — Dropped from the monorepo and npm release train.
- **`@tyravel/broadcasting-pusher`** — Dropped from the monorepo and npm release train.
- **`socket.io-client` and `pusher-js`** — No longer peer dependencies of `@tyravel/echo`; `SocketIoConnector`, `PusherConnector`, and their drivers are gone.

### Migration (0.12.x → 0.13.0)

**Broadcasting config** — replace Socket.io or Pusher connections with WebSocket:

```typescript
// config/broadcasting.ts
websocket: {
  driver: 'websocket',
  redisConnection: env('REDIS_CONNECTION', 'default'),
  channel: env('BROADCAST_REDIS_CHANNEL', 'tyravel:broadcast'),
  path: '/tyravel/ws',
},
```

Set `BROADCAST_CONNECTION=websocket` in `.env`.

**Service provider** — swap the driver package in `src/main.ts`:

```typescript
import { WebSocketBroadcastServiceProvider } from '@tyravel/broadcasting-websocket';

new WebSocketBroadcastServiceProvider(app).register();
```

**Dependencies** — remove `@tyravel/broadcasting-socket-io`, `@tyravel/broadcasting-pusher`, `socket.io-client`, and `pusher-js`; add `@tyravel/broadcasting-websocket`.

**Echo client** — remove any `io:` / `pusher:` factory from `resources/client/echo.ts`; the bootstrap JSON from `@echo` now carries `broadcaster`, `host`, `path`, and `authEndpoint` only.

**Node.js** — upgrade to **26+** before installing (`nvm use 26` or equivalent). v0.12.1 raised the minimum; v0.13.0 enforces it at install and test time.

## [0.12.1] - 2026-06-24

### Changed

- **Node.js 26+** — Raised the minimum supported Node.js version from 22 to 26 across all `@tyravel/*` packages, CI, and documentation.
- **Native PQC only** — `@tyravel/crypto` now uses OpenSSL post-quantum primitives exclusively; removed the `@noble/post-quantum` dependency and JavaScript fallback.
- **Hybrid KEM** — Added a native X25519 + ML-KEM-768 implementation for Node.js 26 (hybrid secret keys are now packed PKCS#8 material, not 32-byte Noble seeds).

### Fixed

- **Native ML-KEM** — Updated encapsulation/decapsulation for Node.js 26's PQC API (`sharedKey` return value and `decapsulate(privateKey, ciphertext)` argument order).

## [0.12.0] - 2026-06-24

### Added

- **Full localization** — `@tyravel/locale` with `SetLocale` middleware, fallback locale chain, nested keys, ICU pluralization, framework validation/auth/pagination catalogs, and cross-channel translation in mail, notifications, and queued jobs.
- **Locale DX** — per-user locale resolution, `formatDate()` / `formatNumber()` / `formatCurrency()` helpers, localized route prefixes, and `tyravel lang:publish` / `lang:missing` commands.
- **Optional admin panel** — `@tyravel/admin` with `tyravel admin:install`, resource CRUD, filters/search/pagination, policy integration, relation fields, bulk actions, dashboard stub, custom field types, and audit log.
- **Advanced debugging** — `@tyravel/debug` request timeline and dev debug bar, slow query + N+1 warnings, request replay metadata, OpenTelemetry exporter, job/event correlation with HTTP requests, and `tyravel debug:clear` / `debug:watch` commands.

### Changed

- **Queue worker hook** — `setQueueWorkerProcessHook()` for post-process instrumentation (used by debug job correlation).
- **Broadcasting scaffold** — channel rules use full `private-` / `presence-` prefixes to match Echo auth payloads.

## [0.11.0] - 2026-06-24

### Added

- **Auth security hardening** — Global CSRF middleware (HTTP 419), timing-safe password reset, `SESSION_SECURE` cookie support, token ability middleware, and `registerOAuthDriver()` for custom social providers.
- **API token hardening** — `tyr_` token prefix, `token_prefix` / `last_used_ip` / `revoked_at` / `ip_whitelist` columns, `Auth.createToken()` options (`expiresIn`, `ipWhitelist`), `Auth.revokeToken()` / `revokeAllTokens()`, and `request.tokenId` on bearer auth.
- **Social OAuth** — PKCE on all built-in providers; X, Facebook, LinkedIn, and Apple drivers; `tyravel make:social-driver`.
- **OAuth2 authorization server** — `@tyravel/auth-oauth` with authorization code (+ PKCE), client credentials, and refresh token grants; `tyravel oauth:install`, `tyravel oauth:client:create`, and `auth:oauth` middleware.
- **Post-quantum cryptography** — `@tyravel/crypto` with ML-KEM, ML-DSA, SLH-DSA, and hybrid X25519 + ML-KEM-768; native OpenSSL PQC when available, `@noble/post-quantum` fallback on Node 22.
- **Crypto integrations** — Optional AES-256-GCM session encryption at rest and ML-DSA signed OAuth access tokens; `tyravel crypto:install` and `tyravel crypto:generate-keys`.

## [0.10.0] - 2026-06-24

### Added

- **Tier 10 — full-stack interactivity** — `@tyravel/ssr` hydration runtime, `@tyravel/echo` Laravel Echo-style client, and scaffold integration via `tyravel new`.
- **Streaming SSR** — `View.streamSsr()`, `Response.ssrStream()`, and `streamSsrDocument()` with chunked response flushing.
- **Islands** — `@island` directive, `View.catalog()`, `registerProgrammaticIsland()`, and `tyravel make:island [--programmatic]`.
- **Echo scaffold** — `@echo` views directive, `channels.ts` / `echo.ts` stubs, and `resolveEchoClientConfig`.
- **Echo presence** — `.here()`, `.joining()`, `.leaving()`, and `.error()` callbacks on presence channels; `EchoChannelEventMap` typing; `echo.connected()` / `disconnected()` / `reconnecting()` lifecycle hooks.

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

[0.14.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.14.0
[0.13.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.13.0
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
[0.11.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.11.0
[0.10.0]: https://github.com/thesimonharms/tyravel/releases/tag/v0.10.0
[0.9.1]: https://github.com/thesimonharms/tyravel/releases/tag/v0.9.1
