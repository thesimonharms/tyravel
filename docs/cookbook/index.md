# Cookbook

Short, goal-oriented recipes for common Tyravel tasks. Each recipe assumes **1.0.x** and links to guide chapters for depth.

## Recipes

| Recipe | When to use it |
|--------|----------------|
| [Realtime UI with Echo](/cookbook/realtime-echo) | Push server events to the browser over WebSockets |
| [RAG Q&A endpoint](/cookbook/rag-q-and-a) | Ingest documents and answer questions with retrieval |
| [Testing with fakes](/cookbook/testing-fakes) | Assert mail, notifications, and broadcasts in Vitest |
| [Admin panel](/cookbook/admin-panel) | Optional CRUD UI with audit log |
| [Multi-locale apps](/cookbook/multi-locale) | JSON locales, `lang:publish`, missing-key checks |
| [Production observability](/cookbook/observability) | Health probes, structured logs, queue failure signals |
| [Multi-tenant apps](/cookbook/multi-tenant) | Subdomain tenancy with global scopes and channel isolation |

## Conventions

- Recipes use `tyravel new` defaults (SQLite + database queue) unless noted.
- Optional driver packages (`@tyravel/redis-node`, `@tyravel/database-pg`, …) are called out explicitly.
- Stable vs experimental APIs follow [API stability](/guide/api-stability).

## Contributing a recipe

Open a PR adding a page under `docs/cookbook/` and register it in `scripts/generate-docs.mjs` tutorial/cookbook sidebar lists (or the generated `sidebar.mts` cookbook section).