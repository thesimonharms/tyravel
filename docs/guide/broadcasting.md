# Broadcasting & realtime

Push server events to browser clients over Pondoknusa's native WebSocket hub (since **v0.13.0**).

## Architecture

```
Controller / Event  →  Broadcast facade  →  WebSocket hub (/pondoknusa/ws)
                              ↓
                         Redis pub/sub (multi-process fan-out)
                              ↓
                         @pondoknusa/echo (browser WebSocket client)
```

No Socket.io or Pusher — the browser uses the native `WebSocket` API.

## Server setup

### 1. Scaffold with Redis

```bash
pondoknusa new my-app --redis
```

Or add `@pondoknusa/broadcasting-websocket` and `@pondoknusa/redis-node` manually.

### 2. Config

```typescript
// config/broadcasting.ts
export default {
  default: env('BROADCAST_CONNECTION', 'websocket'),
  connections: {
    websocket: {
      driver: 'websocket',
      redisConnection: env('REDIS_CONNECTION', 'default'),
      channel: env('BROADCAST_REDIS_CHANNEL', 'pondoknusa:broadcast'),
      path: '/pondoknusa/ws',
    },
  },
};
```

### 3. Provider

```typescript
import { WebSocketBroadcastServiceProvider } from '@pondoknusa/broadcasting-websocket';
```

### 4. Channel authorization

`routes/channels.ts` (scaffolded since v0.16; included in 1.x scaffolds):

```typescript
import { Broadcast } from '@pondoknusa/core';

Broadcast.channel('orders', () => true);

Broadcast.channel('private-orders.{orderId}', (user, orderId) => {
  return Boolean(user);
});
```

Private channels use the `private-` prefix to match Echo client subscriptions.

## Broadcasting events

```typescript
import { Broadcast } from '@pondoknusa/core';

await Broadcast.to('orders').emit('OrderShipped', { id: order.id });
```

Queue broadcast jobs when `config/broadcasting.ts` sets `queue` / `queueConnection`.

## Client (`@pondoknusa/echo`)

```typescript
import { Echo, readEchoConfigFromDocument } from '@pondoknusa/echo';

const config = readEchoConfigFromDocument();
if (config) {
  const echo = new Echo(config);
  echo.private(`orders.${orderId}`).listen('OrderShipped', handler);
}
```

`@vite` or view helpers inject Echo config when the websocket driver is active.

## Production deployment

| Concern | Recommendation |
|---------|----------------|
| **Path** | Reverse-proxy `/pondoknusa/ws` with WebSocket upgrade headers |
| **Redis** | Required when running multiple app processes |
| **TLS** | Terminate WSS at the proxy; Echo uses `wss://` from `APP_URL` |
| **Auth** | `/broadcasting/auth` issues channel tokens — keep behind session middleware |
| **Sticky sessions** | Not required when Redis pub/sub fan-out is configured |

### Redis fan-out

Each app process runs a local WebSocket hub. When one process broadcasts, it publishes to the Redis channel configured in `config/broadcasting.ts` (`BROADCAST_REDIS_CHANNEL`, default `pondoknusa:broadcast`). Other processes subscribe and push the event to their connected clients.

Single-process deploys work for development. Production with horizontal scale **requires** Redis — see [Deploy with Docker](/guide/deployment/docker) for adding a `redis` service to compose.

### Reverse proxy

Terminate TLS at the proxy and forward upgrade headers for both the WebSocket path and channel auth:

| Path | Purpose |
|------|---------|
| `/pondoknusa/ws` | WebSocket upgrade |
| `/broadcasting/auth` | Private/presence channel authorization (session + CSRF) |

#### Nginx

```nginx
location /pondoknusa/ws {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 86400;
}

location /broadcasting/auth {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Caddy

```caddyfile
reverse_proxy /pondoknusa/ws 127.0.0.1:3000 {
  header_up Host {host}
  transport http {
    versions h2c 1.1
  }
}
```

#### Fly.io / Railway

Both platforms pass WebSocket upgrades on the same HTTP port as your app. Set `BROADCAST_CONNECTION=websocket`, attach Redis (Fly Redis, Upstash, or Railway Redis plugin), and ensure `REDIS_URL` / `REDIS_HOST` env vars match your Redis config.

### Echo client in production

```typescript
const echo = new Echo({
  broadcaster: 'websocket',
  host: window.location.host,
  path: '/pondoknusa/ws',
  forceTLS: window.location.protocol === 'https:',
});
```

`readEchoConfigFromDocument()` reads values injected by the view layer when `BROADCAST_CONNECTION=websocket` — prefer that over hard-coding hosts in `.tyr` templates.

## Local development

```bash
pondoknusa serve
```

Single-process mode works without Redis; add Redis when testing multi-worker fan-out.

## Related

- [Cookbook: Realtime UI with Echo](/cookbook/realtime-echo)
- [Tutorial 4: Realtime & deploy](/tutorials/04-realtime-and-deploy)
- [0.13.0 migration](https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md#0130---2026-06-25)