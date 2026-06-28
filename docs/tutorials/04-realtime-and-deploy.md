# 4. Realtime & deploy

Broadcast domain events to the browser and ship to production.

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
| Config cache | `tyravel config:cache` |
| Route cache | `tyravel route:cache` |
| View compile cache | `tyravel view:cache` + `compiled: true` |
| Deploy gate | `tyravel deploy:check` |
| Queue worker | `tyravel queue:work` (separate process) |
| Graceful shutdown | Built into `serve()` / `tyravel start` |

## Choose a host

| Guide | Best for |
|-------|----------|
| [Platform matrix](/guide/deployment/platforms) | Compare options |
| [Railway](/guide/deployment/railway) | Fastest first deploy |
| [Fly.io](/guide/deployment/fly) | Multi-region + Postgres |
| [Docker](/guide/deployment/docker) | VPS / Kubernetes |
| [Cloudflare](/guide/deployment/cloudflare) | CDN + R2 in front of Node |
| [CI/CD](/guide/deployment/ci-cd) | GitHub Actions release pipeline |
| [Tyravel Cloud](/guide/deployment/tyravel-cloud) | Future managed platform |

Manifests: [`examples/hello-world/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy).

Minimum production boot:

```bash
export NODE_ENV=production APP_DEBUG=false
export TYRAVEL_HOST=0.0.0.0 TYRAVEL_PORT=${PORT:-3000}
tyravel migrate
tyravel config:cache && tyravel route:cache && tyravel view:cache
tyravel start
```

Run `tyravel queue:work` in a separate process when using the database or Redis queue.

## Cloudflare in one minute

Full Tyravel does not run on Workers yet. The recommended pattern:

1. Deploy to Fly or Railway (Node origin).
2. Add domain in Cloudflare (proxied DNS).
3. Optional: R2 for uploads via `@tyravel/storage-r2`.
4. Cache public GETs with [ETag middleware](/cookbook/edge-cache).

Details: [Deploy with Cloudflare](/guide/deployment/cloudflare).

## Cookbook & reference

- [Realtime UI with Echo](/cookbook/realtime-echo)
- [Edge response cache](/cookbook/edge-cache)
- [Performance](/guide/performance)
- [CLI reference](/reference/generated/cli)
- [Upgrading to 1.0](/guide/upgrading-to-1.0)