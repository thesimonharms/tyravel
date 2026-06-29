import type { BroadcastingConfig } from '@pondoknusa/broadcasting';
import { env, envInt } from '@pondoknusa/config';

export default {
  default: env('BROADCAST_CONNECTION', 'log'),
  connections: {
    null: { driver: 'null' },
    log: { driver: 'log' },
    websocket: {
      driver: 'websocket',
      redisConnection: env('REDIS_CONNECTION', 'default'),
      channel: env('BROADCAST_REDIS_CHANNEL', 'pondoknusa:broadcast'),
      path: '/pondoknusa/ws',
    },
  },
  queueConnection: env('QUEUE_CONNECTION', 'database'),
  queue: 'default',
} satisfies BroadcastingConfig;
