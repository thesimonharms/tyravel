import type { BroadcastingConfig } from '@tyravel/broadcasting';
import { env, envInt } from '@tyravel/config';

export default {
  default: env('BROADCAST_CONNECTION', 'log'),
  connections: {
    null: { driver: 'null' },
    log: { driver: 'log' },
    websocket: {
      driver: 'websocket',
      redisConnection: env('REDIS_CONNECTION', 'default'),
      channel: env('BROADCAST_REDIS_CHANNEL', 'tyravel:broadcast'),
      path: '/tyravel/ws',
    },
  },
  queueConnection: env('QUEUE_CONNECTION', 'database'),
  queue: 'default',
} satisfies BroadcastingConfig;
