# 4. Realtime & deploy

Broadcast domain events to the browser and ship to production.

## WebSocket broadcasting

Since **v0.13.0**, Pondoknusa ships a native WebSocket hub (`@pondoknusa/broadcasting-websocket`) — no Socket.io or Pusher.

Follow the full [Broadcasting & realtime](/guide/broadcasting) guide for config, channel auth, Echo client setup, and nginx proxy notes.

Quick checklist:

1. Scaffold with Redis: `pondoknusa new my-app --redis`
2. Set `BROADCAST_CONNECTION=websocket` in `.env`
3. Register `WebSocketBroadcastServiceProvider` in `src/main.ts`
4. Define channels in `routes/channels.ts` (private channel prefixes ship in current scaffolds since **v0.16**)

`examples/hello-world` does not include broadcasting yet — use a `--redis` scaffold or the [realtime Echo recipe](/cookbook/realtime-echo) for a minimal client.

## Production checklist

| Task | Command / config |
|------|------------------|
| Config cache | `pondoknusa config:cache` |
| Route cache | `pondoknusa route:cache` |
| View compile cache | `pondoknusa view:cache` + `compiled: true` |
| Deploy gate | `pondoknusa deploy:check` |
| Queue worker | `pondoknusa queue:work` (separate process) |
| Graceful shutdown | Built into `serve()` / `pondoknusa start` |

## Choose a host

| Guide | Best for |
|-------|----------|
| [Platform matrix](/guide/deployment/platforms) | Compare options |
| [Railway](/guide/deployment/railway) | Fastest first deploy |
| [Fly.io](/guide/deployment/fly) | Multi-region + Postgres |
| [Docker](/guide/deployment/docker) | VPS / Kubernetes |
| [Cloudflare](/guide/deployment/cloudflare) | CDN + R2 in front of Node |
| [CI/CD](/guide/deployment/ci-cd) | GitHub Actions release pipeline |
| [Pondoknusa Cloud](/guide/deployment/pondoknusa-cloud) | Future managed platform |

Manifests: [`examples/hello-world/deploy/`](https://github.com/pondoknusa/pondoknusa/tree/main/examples/hello-world/deploy).

Minimum production boot:

```bash
export NODE_ENV=production APP_DEBUG=false
export PONDOKNUSA_HOST=0.0.0.0 PONDOKNUSA_PORT=${PORT:-3000}
pondoknusa migrate
pondoknusa config:cache && pondoknusa route:cache && pondoknusa view:cache
pondoknusa start
```

Run `pondoknusa queue:work` in a separate process when using the database or Redis queue.

## Cloudflare in one minute

Full Pondoknusa does not run on Workers yet. The recommended pattern:

1. Deploy to Fly or Railway (Node origin).
2. Add domain in Cloudflare (proxied DNS).
3. Optional: R2 for uploads via `@pondoknusa/storage-r2`.
4. Cache public GETs with [ETag middleware](/cookbook/edge-cache).

Details: [Deploy with Cloudflare](/guide/deployment/cloudflare).

## Cookbook & reference

- [Realtime UI with Echo](/cookbook/realtime-echo)
- [Edge response cache](/cookbook/edge-cache)
- [Performance](/guide/performance)
- [CLI reference](/reference/generated/cli)
- [Upgrading to 1.0](/guide/upgrading-to-1.0)