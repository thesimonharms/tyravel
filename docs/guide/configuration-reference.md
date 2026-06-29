# Configuration reference

Pondoknusa apps load typed config from `config/*.ts`. Each file exports a `default` object and may export a `schema` for boot-time validation.

Scaffold sources live in `packages/cli/src/stubs*.ts`. Optional configs are added by `pondoknusa auth:install`, `crypto:install`, etc.

## Default scaffold (`pondoknusa new`)

### `config/app.ts`

| Key | Env var | Default | Notes |
|-----|---------|---------|-------|
| `name` | `APP_NAME` | project name | Application display name |
| `debug` | `APP_DEBUG` | `true` | Verbose errors when true |
| `url` | `APP_URL` | `http://127.0.0.1:3000` | Base URL for signed links |
| `locale` | `APP_LOCALE` | `en` | Default locale |
| `fallback_locale` | `APP_FALLBACK_LOCALE` | `en` | Missing translation fallback |
| `faker_locale` | `APP_FAKER_LOCALE` | `en` | Factory/faker locale |
| `locales_path` | — | `lang` | Directory for JSON locale files |
| `available_locales` | — | `['en']` | Locales exposed to the app |

### `config/database.ts`

| Key | Env var | Notes |
|-----|---------|-------|
| `default` | `DB_CONNECTION` | `sqlite`, `mysql`, or `postgres` |
| `connections.sqlite.database` | `DB_DATABASE` | Path to SQLite file |
| `connections.mysql.*` | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Requires `@pondoknusa/database-mysql` |
| `connections.postgres.*` | same pattern | Requires `@pondoknusa/database-pg` |

### `config/queue.ts`

| Key | Env var | Notes |
|-----|---------|-------|
| `default` | `QUEUE_CONNECTION` | `database` (default) or `redis` |
| `connections.database` | — | Uses default DB connection |
| `connections.redis` | — | Requires `@pondoknusa/redis-node` |
| `failed.table` | — | `failed_jobs` |

### `config/cache.ts`

| Key | Env var | Notes |
|-----|---------|-------|
| `default` | `CACHE_STORE` | `array`, `file`, or `redis` |
| `prefix` | — | Key prefix for all stores |

### `config/views.ts`

| Key | Notes |
|-----|-------|
| `path` | `resources/views` |
| `extension` | `.tyr` |
| `compiledPath` | `storage/framework/views` — set `compiled: true` in production |
| `locale` / `localesPath` | View translation paths |

### `config/mail.ts`

| Key | Env var | Notes |
|-----|---------|-------|
| `default` | `MAIL_MAILER` | `log`, `array`, or `smtp` |
| `from.address` | `MAIL_FROM_ADDRESS` | |
| `from.name` | `MAIL_FROM_NAME` | |
| `connections.smtp.*` | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION` | |

### `config/broadcasting.ts`

| Key | Env var | Notes |
|-----|---------|-------|
| `default` | `BROADCAST_CONNECTION` | `log`, `null`, or `websocket` |
| `connections.websocket.path` | — | `/pondoknusa/ws` |
| `connections.websocket.redisConnection` | `REDIS_CONNECTION` | Fan-out across processes |

### `config/http.ts`

| Key | Notes |
|-----|-------|
| `trustedProxies` | IPs trusted for `X-Forwarded-*` |
| `throttle.enabled` | Global rate limiting |
| `throttle.limits.api` | Preset for `Route.throttle('api')` |

### Other default files

| File | Purpose |
|------|---------|
| `config/events.ts` | Listener map, subscribers, queue connection |
| `config/filesystems.ts` | `FILESYSTEM_DISK` — local disk by default |
| `config/cors.ts` | CORS middleware defaults |
| `config/log.ts` | `LOG_CHANNEL` — stack/stdout/file |
| `config/health.ts` | `/health` probe toggles |
| `config/notifications.ts` | Database notification table |
| `config/redis.ts` | Present when scaffolded with `--redis` |

## Optional install configs

| Command | File | Purpose |
|---------|------|---------|
| `pondoknusa auth:install` | `config/auth.ts` | Guards, providers, session, tokens, OAuth, policies |
| `pondoknusa oauth:install` | `config/oauthServer.ts` | OAuth2 server token TTLs |
| `pondoknusa admin:install` | `config/admin.ts` | Admin panel prefix, audit log |
| `pondoknusa debug:install` | `config/debug.ts` | Debug bar, slow query thresholds |
| `pondoknusa crypto:install` | `config/crypto.ts` | PQC algorithms, session/OAuth signing |
| `pondoknusa new --ai` | `config/vector.ts` | Embedding metric, batch size |

## Validation

Add a `schema` export using `s` from `@pondoknusa/config` (see `config/app.ts` stub). Boot fails fast when required env vars are missing or invalid.

See [Configuration](/guide/configuration) for loading, merging, and `env()` helpers.