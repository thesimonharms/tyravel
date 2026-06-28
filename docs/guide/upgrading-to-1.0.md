# Upgrading to 1.0

Tyravel **1.0.0** is the first semver-strict release. Apps on **0.11–0.16** can prepare now by adopting async APIs and removing deprecated sync helpers that **0.16.0** dropped ahead of 1.0.

Read [API stability](/guide/api-stability) for the full policy. This page is the practical migration checklist.

## Before you upgrade

1. Pin to the latest **0.16.x** and run your test suite.
2. Search your app for the removed symbols listed below.
3. Upgrade across minors using the [changelog](https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md) — especially **0.9.0**, **0.13.0**, and **0.16.0**.

## Removed sync helpers (0.16.0)

These APIs were deprecated in **0.9.0** and removed in **0.16.0** as part of the v0.16 closeout. They will **not** return in 1.0.

| Removed API | Replacement |
|-------------|-------------|
| `loadEnvSync()` | `await loadEnv()` |
| `findProjectRootSync()` | `await findProjectRoot()` |
| `loadProjectConfigSync()` | `await loadProjectConfig()` |
| `requireProjectRootSync()` | `await requireProjectRoot()` |
| `writeFileSync()` (`@tyravel/cli` utils) | `await writeFile()` |
| `readCompiledCacheSync()` | `await readCompiledCache()` |
| `writeCompiledCacheSync()` | `await writeCompiledCache()` |
| `clearCompiledCacheDirSync()` | `await clearCompiledCacheDir()` |
| `discoverViewNamesSync()` | `await discoverViewNames()` |

### Common call-site updates

```typescript
// Config
await loadEnv(appRoot);

// CLI project discovery
const root = await requireProjectRoot();
const config = await loadProjectConfig(root);

// View catalog (now async end-to-end)
const catalog = await View.catalog();
const islands = await View.islandCatalog();

// Compiled view cache (if you call helpers directly)
const entry = await readCompiledCache(cacheFile);
```

## Async-native platform (0.9.0)

If you have not migrated since **0.9.0**, also update:

- **`View.exists(name)`** — returns `Promise<boolean>`; callers must `await`.
- **Queue connection** — remove `sync` from `config/queue.ts`; use `database` or `redis`. Tests that relied on inline sync dispatch should drain the queue explicitly.
- **Provider and config I/O** — boot paths assume `await` on filesystem helpers.

See the [0.9.0 changelog](https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md#090---2026-06-24) for the full table.

## Broadcasting (0.13.0)

**0.13.0** replaced Socket.io and Pusher drivers with the native WebSocket driver.

1. Set `BROADCAST_CONNECTION=websocket` in `.env`.
2. Register `WebSocketBroadcastServiceProvider` instead of Socket.io/Pusher providers.
3. Update `config/broadcasting.ts` with a `websocket` connection (see [0.13.0 changelog](https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md#0130---2026-06-25)).
4. Remove `socket.io-client` and `pusher-js` from client code; use `@tyravel/echo` with the native connector.

## Tier 16 additions (optional adoption)

**0.16.0** ships new stable APIs you can adopt incrementally — none are required to reach 1.0.

### Models

- **Route model binding** — implicit `{post}` parameters resolve models; customize with `Route.bind()`.
- **Prunable models** — implement `prunable()` and run `tyravel model:prune`.
- **UUID / ULID keys** — extend `HasUuids` or `HasUlids` base classes.
- **Lazy-load guard** — call `Model.preventLazyLoading()` in development.

### Routes

- **Signed URLs** — `URL.signed()` and `URL.temporarySigned()`.
- **Route caching** — `tyravel route:cache` / `tyravel route:clear` for production boot.
- **Route groups** — `Route.group({ prefix, middleware, as }, () => { … })`.
- **Per-route throttling** — `.throttle('api')` on individual routes.

### Views

- **Typed props** — augment `ViewPropsMap` or run `tyravel view:types` for generated declarations.
- **Strict lint** — enable `tyravel view:lint --strict` in CI.
- **Partial reloads** — `View.partial()`, `View.renderFragment()`, and `Response.partial()` for Turbo/HTMX-style updates.
- **Design-system export** — `tyravel view:catalog --json`.

## Experimental APIs in 1.0

These remain **experimental** and may still change in minors before or shortly after 1.0:

- Programmatic `.tyr.ts` views and programmatic island mounts
- `tyravel shell` / REPL facade loading
- `Bus` auto-discovery conventions (not a core facade)

`View.catalog()` and `View.islandCatalog()` are **stable** as of **0.16.x** (async catalog discovery). For design-system export, `tyravel view:catalog --json` remains the recommended CLI path.

## Checklist

- [ ] No `*Sync` helpers from `@tyravel/config`, `@tyravel/cli`, or `@tyravel/views`
- [ ] `await View.exists()` and `await View.catalog()` at call sites
- [ ] Queue config uses `database` or `redis`, not `sync`
- [ ] Broadcasting uses the WebSocket driver (0.13+)
- [ ] Production views use compiled cache (`view:cache` / `config/views.ts` `compiled: true`)
- [ ] Tests pass on **1.0.x** (or latest **0.16.x** if you are mid-migration)

**1.0.0** shipped in June 2026. Stable APIs only break in major releases per [STABILITY.md](https://github.com/thesimonharms/tyravel/blob/main/STABILITY.md).