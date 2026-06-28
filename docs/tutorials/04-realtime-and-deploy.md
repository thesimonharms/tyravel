# 4. Realtime & deploy

Broadcast domain events to the browser and prepare for production.

## WebSocket broadcasting

Since **v0.13.0**, Tyravel ships a native WebSocket hub (`@tyravel/broadcasting-websocket`) — no Socket.io or Pusher.

Follow the full [Broadcasting & realtime](/guide/broadcasting) guide for config, channel auth, Echo client setup, and nginx proxy notes.

Quick checklist:

1. Scaffold with Redis: `tyravel new my-app --redis`
2. Set `BROADCAST_CONNECTION=websocket` in `.env`
3. Register `WebSocketBroadcastServiceProvider` in `src/main.ts`
4. Define channels in `routes/channels.ts` (private channel prefixes ship in current scaffolds since **v0.16**)

`examples/hello-world` does not include broadcasting yet — use a `--redis` scaffold or the [realtime Echo recipe](/cookbook/realtime-echo) for a minimal client.

## Production checklist

| Task | Command / config |
|------|------------------|
| Route cache | `tyravel route:cache` |
| View compile cache | `tyravel view:cache` + `config/views.ts` `compiled: true` |
| Env validation | Per-file `schema` in `config/*.ts` |
| Queue worker | `tyravel queue:work` under a process supervisor |
| Graceful shutdown | `SIGTERM` handling is built into `serve()` |

## Deploy targets

Tyravel runs on any Node 26+ host (container, VM, bare metal). Standard Web APIs mean adapters stay thin — see `serve()` in `@tyravel/core`.

### Platform walkthroughs

Copy-paste manifests live in [`examples/hello-world/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy).

| Guide | When to use |
|-------|-------------|
| [Deployment overview](/guide/deployment) | Shared checklist, env vars, process model |
| [Docker](/guide/deployment/docker) | Self-hosted, compose stacks, any orchestrator |
| [Fly.io](/guide/deployment/fly) | Managed Postgres + Redis at the edge |
| [Railway](/guide/deployment/railway) | Fast managed deploy with Postgres plugins |

Minimum production boot:

```bash
export NODE_ENV=production TYRAVEL_HOST=0.0.0.0 TYRAVEL_PORT=${PORT:-3000}
tyravel migrate && tyravel route:cache && tyravel view:cache
tyravel start
```

Run `tyravel queue:work` in a separate process when using the database queue.

## Cookbook & reference

- [Realtime UI with Echo](/cookbook/realtime-echo) — recipe for channel auth + client bootstrap
- [CLI reference](/reference/generated/cli) — full command list
- [Upgrading to 1.0](/guide/upgrading-to-1.0) — migration checklist for apps on 0.x