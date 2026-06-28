# Introduction

![Tyravel logo](/logo.svg){width=80}

Tyravel is a TypeScript-native web framework that brings Laravel-style ergonomics to Node.js 26+. It runs on standard Web APIs (`Request`, `Response`, `fetch`) and ships as a set of focused npm packages you can adopt incrementally.

## What you get

- **Application kernel** — service container, providers, HTTP kernel, and facades (`Route`, `Auth`, `Queue`, …)
- **HTTP layer** — router with groups and named routes, middleware registry, JSON/HTML/XML responses
- **Database** — Eloquent-style models, query builder, migrations, factories, seeders, and pagination
- **Auth** — session and token guards, social OAuth (GitHub, Google, X, Apple, …), OAuth2 server, CSRF, API token hardening, policies, password reset
- **Crypto** — post-quantum KEM/signatures (`@tyravel/crypto`), session encryption at rest, signed OAuth tokens
- **Async work** — typed jobs, database/redis queue drivers, domain events and listeners (async-native boot and I/O since v0.9.0)
- **DX** — `tyravel` CLI for scaffolding, migrations, seeding, and a built-in dev server

## Requirements

- Node.js **26+** (Bun is also supported as a runtime)
- npm workspaces for monorepo development; published packages install like any other dependency

## Packages

| Package | Role |
|---------|------|
| `@tyravel/core` | Application kernel and facades |
| `@tyravel/http` | Router, middleware, requests, responses |
| `@tyravel/database` | ORM, migrations, pagination |
| `@tyravel/auth` | Guards, sessions, social OAuth, policies |
| `@tyravel/auth-oauth` | OAuth2 authorization server |
| `@tyravel/crypto` | Post-quantum encryption and signatures |
| `@tyravel/cli` | Project scaffolding and generators |

See the [package reference](/reference/generated/packages) for every `@tyravel/*` package, or the [monorepo README](https://github.com/thesimonharms/tyravel#packages) for a quick overview.

## Documentation map

| Section | Best for |
|---------|----------|
| [Guide](/guide/introduction) | Concepts and how things work |
| [Reference](/reference/) | Package exports, CLI commands, facades |
| [Tutorials](/tutorials/) | Zero-to-deploy learning path |
| [Cookbook](/cookbook/) | Focused recipes (realtime, RAG, testing) |
| [Configuration reference](/guide/configuration-reference) | Every `config/*.ts` key from scaffolds |
| [Broadcasting](/guide/broadcasting) | WebSocket hub, Echo client, production deploy |
| [Deployment](/guide/deployment) | Platform matrix, Docker, Fly, Railway, Cloudflare, CI/CD |
| [Tyravel Cloud](/guide/deployment/tyravel-cloud) | Planned managed hosting (like Laravel Cloud) |
| [Ecosystem](/guide/ecosystem) | Publishing third-party `@tyravel/*` extensions |

## Upgrading

Tyravel **1.0.x** follows strict semver for stable APIs. Read [API stability](/guide/api-stability) before upgrading across minor versions. Apps still on **0.11–0.16** should follow [Upgrading to 1.0](/guide/upgrading-to-1.0) to drop removed sync helpers and adopt async catalog APIs.