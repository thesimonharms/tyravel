import type { RedisManager } from '@tyravel/redis';
import type { SessionStore } from './session.js';

export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: RedisManager,
    private readonly connectionName: string,
    private readonly prefix = 'tyravel:session',
  ) {}

  async read(id: string): Promise<Record<string, unknown>> {
    const client = await this.redis.connection(this.connectionName);
    const value = await client.get(this.key(id));
    if (value === null) {
      return {};
    }

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async write(
    id: string,
    data: Record<string, unknown>,
    lifetimeMinutes: number,
  ): Promise<void> {
    const client = await this.redis.connection(this.connectionName);
    await client.set(this.key(id), JSON.stringify(data), {
      EX: lifetimeMinutes * 60,
    });
  }

  async destroy(id: string): Promise<void> {
    const client = await this.redis.connection(this.connectionName);
    await client.del(this.key(id));
  }

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }
}