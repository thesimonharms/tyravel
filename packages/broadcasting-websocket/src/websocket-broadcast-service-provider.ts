import type { RedisManager } from '@pondoknusa/redis';
import { registerWebSocketBroadcastDriver, setWebSocketRedisManager } from './register.js';

export class WebSocketBroadcastServiceProvider {
  constructor(private readonly app: { make<T>(key: string): T }) {}

  register(): void {
    try {
      const redis = this.app.make<RedisManager>('redis');
      setWebSocketRedisManager(redis);
    } catch {
      // Redis provider not registered.
    }
    registerWebSocketBroadcastDriver();
  }
}