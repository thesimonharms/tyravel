# Realtime UI with Echo

Wire server broadcasts to a browser client using the native WebSocket driver.

## Server

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

```typescript
// src/main.ts
import { WebSocketBroadcastServiceProvider } from '@pondoknusa/broadcasting-websocket';
```

Authorize private channels in `routes/channels.ts` using `private-` prefixes to match Echo conventions.

## Client

```typescript
import { Echo } from '@pondoknusa/echo';

const echo = new Echo({
  broadcaster: 'websocket',
  host: window.location.host,
  path: '/pondoknusa/ws',
});

echo.private(`users.${userId}`).listen('NotificationSent', (event) => {
  console.log(event);
});
```

## Debugging

- `pondoknusa route:list --json` — confirm `/broadcasting/auth` is registered
- Redis required for multi-process fan-out
- See [0.13 migration notes](https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md#0130---2026-06-25) if upgrading from Socket.io