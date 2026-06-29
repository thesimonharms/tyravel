import { describe, expect, it } from 'vitest';
import { MemoryRedis, type RedisManager } from '@pondoknusa/redis';
import { Job } from './job.js';
import { JobRegistry } from './registry.js';
import { QueueManager } from './queue-manager.js';
import { QueueProcessor } from './queue-processor.js';
import { RedisQueue } from './redis-queue.js';
import type { QueueConfig } from './types.js';
import { QueueWorker } from './worker.js';

class PersistedJob extends Job<{ value: string }> {
  static values: string[] = [];

  override async handle(): Promise<void> {
    PersistedJob.values.push(this.data.value);
  }
}

function asRedisManager(client: MemoryRedis): RedisManager {
  return {
    connection: async () => client as never,
    prefixKey: (key: string) => key,
    close: async () => {},
  } as unknown as RedisManager;
}

describe('RedisQueue', () => {
  it('stores and processes jobs through the worker', async () => {
    PersistedJob.values = [];
    const redis = asRedisManager(new MemoryRedis());
    const queue = new RedisQueue(redis, { driver: 'redis', blockTimeout: 0 });

    await queue.push(new PersistedJob({ value: 'redis-job' }));

    const record = await queue.pop('default');
    expect(record).not.toBeNull();

    const registry = new JobRegistry().register(PersistedJob);
    const worker = new QueueWorker(registry);
    await worker.process(queue.decode(record!));
    await queue.deleteJob(record!.id);

    expect(PersistedJob.values).toEqual(['redis-job']);
  });

  it('processes queued jobs via QueueProcessor', async () => {
    PersistedJob.values = [];
    const redis = asRedisManager(new MemoryRedis());
    const registry = new JobRegistry().register(PersistedJob);
    const worker = new QueueWorker(registry);
    const config: QueueConfig = {
      default: 'redis',
      connections: {
        redis: { driver: 'redis', blockTimeout: 0 },
      },
    };

    const manager = new QueueManager(config, worker, undefined, redis);
    const queue = manager.connection('redis') as RedisQueue;

    await queue.push(new PersistedJob({ value: 'queued-redis' }));

    const processor = new QueueProcessor(manager, registry, worker);
    const processed = await processor.run({
      connection: 'redis',
      maxJobs: 1,
      sleepSeconds: 0,
    });

    expect(processed).toBe(1);
    expect(PersistedJob.values).toEqual(['queued-redis']);
  });
});