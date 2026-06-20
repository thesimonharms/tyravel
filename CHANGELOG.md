# Changelog

All notable changes to Tyravel are documented in this file.

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