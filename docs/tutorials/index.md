# Tutorials

A zero-to-deploy learning path for Tyravel **0.16.x**. Each tutorial builds on the last and links to deeper guide chapters.

## Track overview

| Step | Topic | Outcome |
|------|-------|---------|
| [1](/tutorials/01-install-and-first-route) | Install & first route | Running app with a named route and HTML response |
| [2](/tutorials/02-auth-and-database) | Auth & database | Users table, session login, protected routes |
| [3](/tutorials/03-queues-and-events) | Queues & events | Background job, domain event, database queue worker |
| [4](/tutorials/04-realtime-and-deploy) | Realtime & deploy | WebSocket broadcasting, production checklist |

## Before you start

- **Node.js 26+** — Tyravel requires native SQLite, WebSocket, and OpenSSL PQC support.
- **npm** — workspaces are used in the monorepo; generated apps use a normal `package.json`.
- **Guide chapters** — tutorials move quickly; keep the [guide](/guide/introduction) open for detail.

## Example repos

- [`examples/hello-world`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world) — default scaffold with auth, queue, and mail wired; [`deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy) has Docker, Fly, and Railway manifests
- [`examples/rag`](https://github.com/thesimonharms/tyravel/tree/main/examples/rag) — AI/RAG stack (Tier 14)

When a tutorial step has a matching example file, we link to it directly.