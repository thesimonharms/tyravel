import type { RedisClient, RedisClientFactory, RedisConfig, RedisConnectionConfig } from './types.js';

export class RedisManager {
  private static clientFactory: RedisClientFactory | null = null;

  private readonly clients = new Map<string, RedisClient>();
  private readonly connecting = new Map<string, Promise<RedisClient>>();

  constructor(private readonly config: RedisConfig) {}

  static useClientFactory(factory: RedisClientFactory): void {
    RedisManager.clientFactory = factory;
  }

  async connection(name?: string): Promise<RedisClient> {
    const connectionName = name ?? this.config.default;
    const existing = this.clients.get(connectionName);
    if (existing) {
      return existing;
    }

    const pending = this.connecting.get(connectionName);
    if (pending) {
      return pending;
    }

    const connectionConfig = this.config.connections[connectionName];
    if (!connectionConfig) {
      throw new Error(`Redis connection [${connectionName}] is not configured.`);
    }

    const connectPromise = this.createClient(connectionConfig).then((client) => {
      this.clients.set(connectionName, client);
      this.connecting.delete(connectionName);
      return client;
    });

    this.connecting.set(connectionName, connectPromise);
    return connectPromise;
  }

  prefixKey(key: string): string {
    const prefix = this.config.prefix ?? '';
    return prefix ? `${prefix}:${key}` : key;
  }

  async close(name?: string): Promise<void> {
    if (name) {
      const client = this.clients.get(name);
      await client?.quit();
      this.clients.delete(name);
      return;
    }

    await Promise.all([...this.clients.values()].map((client) => client.quit()));
    this.clients.clear();
    this.connecting.clear();
  }

  private async createClient(config: RedisConnectionConfig): Promise<RedisClient> {
    if (!RedisManager.clientFactory) {
      throw new Error(
        'No Redis client factory registered. Install @pondoknusa/redis-node and register NodeRedisServiceProvider, or call RedisManager.useClientFactory().',
      );
    }

    return RedisManager.clientFactory(config);
  }
}