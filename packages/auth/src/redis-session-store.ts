import type { PayloadCipher } from '@tyravel/crypto';
import type { RedisManager } from '@tyravel/redis';
import type { SessionStore } from './session.js';

export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: RedisManager,
    private readonly connectionName: string,
    private readonly prefix = 'tyravel:session',
    private readonly cipher?: PayloadCipher,
  ) {}

  async read(id: string): Promise<Record<string, unknown>> {
    const client = await this.redis.connection(this.connectionName);
    const value = await client.get(this.key(id));
    if (value === null) {
      return {};
    }

    try {
      const decoded = this.cipher ? this.cipher.decrypt(value) : value;
      return JSON.parse(decoded) as Record<string, unknown>;
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
    const serialized = JSON.stringify(data);
    const payload = this.cipher ? this.cipher.encrypt(serialized) : serialized;
    await client.set(this.key(id), payload, {
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