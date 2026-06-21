import { createClient } from 'redis';
import type { RedisClient, RedisConnectionConfig } from '@tyravel/redis';

export async function createNodeRedisClient(
  config: RedisConnectionConfig,
): Promise<RedisClient> {
  const client = createClient(buildClientOptions(config));
  client.on('error', (error) => {
    process.stderr.write(`Redis error: ${String(error)}\n`);
  });
  await client.connect();
  return client as unknown as RedisClient;
}

function buildClientOptions(config: RedisConnectionConfig) {
  if (config.url) {
    return { url: config.url };
  }

  return {
    socket: {
      host: config.host ?? '127.0.0.1',
      port: config.port ?? 6379,
    },
    username: config.username,
    password: config.password,
    database: config.database,
  };
}