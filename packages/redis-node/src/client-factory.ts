import { createClient, createCluster } from 'redis';
import type { RedisClient, RedisConnectionConfig } from '@pondoknusa/redis';
import { resolveSentinelMasterUrl } from './sentinel-discovery.js';

type NodeRedisClient = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<string | null>;
  del(keys: string[]): Promise<number>;
  exists(keys: string[]): Promise<number>;
  scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string>;
  lPush(key: string, elements: string[]): Promise<number>;
  rPop(key: string): Promise<string | null>;
  brPop(key: string, timeout: number): Promise<{ key: string; element: string } | null>;
  zAdd(key: string, entry: { score: number; value: string }): Promise<number>;
  zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]>;
  zRem(key: string, members: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  duplicate(): NodeRedisClient;
  connect(): Promise<void>;
  on(event: 'error', listener: (error: unknown) => void): void;
  quit(): Promise<string>;
  subscribe(
    channels: string,
    listener: (message: string) => void,
  ): Promise<void>;
};

export async function createNodeRedisClient(
  config: RedisConnectionConfig,
): Promise<RedisClient> {
  const client = await createUnderlyingClient(config);
  client.on('error', (error) => {
    process.stderr.write(`Redis error: ${String(error)}\n`);
  });
  await client.connect();
  return new NodeRedisAdapter(client);
}

async function createUnderlyingClient(config: RedisConnectionConfig): Promise<NodeRedisClient> {
  if (config.sentinel) {
    const url = await resolveSentinelMasterUrl(config.sentinel);
    return createClient({ url, ...buildAuthOptions(config) }) as unknown as NodeRedisClient;
  }

  if (config.cluster) {
    const cluster = createCluster({
      rootNodes: config.cluster.nodes.map((node) => ({
        url: typeof node === 'string' ? node : `redis://${node.host}:${node.port ?? 6379}`,
      })),
      defaults: buildAuthOptions(config),
    }) as unknown as NodeRedisClient;
    return cluster as unknown as NodeRedisClient;
  }

  return createClient(buildClientOptions(config)) as unknown as NodeRedisClient;
}

class NodeRedisAdapter implements RedisClient {
  private subscriber?: NodeRedisClient;
  private subscriberReady?: Promise<void>;
  private readonly channelListeners = new Map<string, Set<(message: string) => void>>();

  constructor(private readonly client: NodeRedisClient) {}

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<string | null> {
    return options ? this.client.set(key, value, options) : this.client.set(key, value);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(keys);
  }

  exists(...keys: string[]): Promise<number> {
    return this.client.exists(keys);
  }

  async *scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string> {
    for await (const key of this.client.scanIterator(options)) {
      yield key;
    }
  }

  lPush(key: string, ...elements: string[]): Promise<number> {
    return this.client.lPush(key, elements);
  }

  rPop(key: string): Promise<string | null> {
    return this.client.rPop(key);
  }

  async brPop(
    key: string,
    timeout: number,
  ): Promise<{ key: string; element: string } | null> {
    return this.client.brPop(key, timeout);
  }

  zAdd(key: string, entry: { score: number; value: string }): Promise<number> {
    return this.client.zAdd(key, entry);
  }

  zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]> {
    return this.client.zRangeByScore(key, min, max);
  }

  zRem(key: string, ...members: string[]): Promise<number> {
    return this.client.zRem(key, members);
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async subscribe(channel: string, listener: (message: string) => void): Promise<void> {
    const listeners = this.channelListeners.get(channel) ?? new Set();
    const isNewChannel = listeners.size === 0;
    listeners.add(listener);
    this.channelListeners.set(channel, listeners);

    await this.ensureSubscriber();
    if (!isNewChannel) {
      return;
    }

    await this.subscriber!.subscribe(channel, (message) => {
      for (const registered of this.channelListeners.get(channel) ?? []) {
        registered(message);
      }
    });
  }

  async quit(): Promise<string> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = undefined;
    }
    return this.client.quit();
  }

  private async ensureSubscriber(): Promise<void> {
    if (!this.subscriberReady) {
      this.subscriberReady = (async () => {
        const subscriber = this.client.duplicate();
        subscriber.on('error', (error) => {
          process.stderr.write(`Redis subscriber error: ${String(error)}\n`);
        });
        await subscriber.connect();
        this.subscriber = subscriber;
      })();
    }
    await this.subscriberReady;
  }
}

function buildClientOptions(config: RedisConnectionConfig) {
  if (config.url) {
    return { url: config.url, ...buildAuthOptions(config) };
  }

  return {
    socket: {
      host: config.host ?? '127.0.0.1',
      port: config.port ?? 6379,
    },
    ...buildAuthOptions(config),
  };
}

function buildAuthOptions(config: RedisConnectionConfig) {
  return {
    username: config.username,
    password: config.password,
    database: config.database,
  };
}