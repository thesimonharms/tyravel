import type { CacheStore } from '@pondoknusa/cache';
import type { Container } from '@pondoknusa/container';
import type { DatabaseManager } from '@pondoknusa/database';
import type { RedisManager } from '@pondoknusa/redis';
import { BatchRepository } from './batch.js';
import { Dispatcher } from './dispatcher.js';
import { JobRegistry } from './registry.js';
import { QueueManager } from './queue-manager.js';
import { QueueProcessor } from './queue-processor.js';
import type { QueueConfig } from './types.js';
import { QueueWorker } from './worker.js';

export function createQueueStack(options: {
  config: QueueConfig;
  registry: JobRegistry;
  database?: DatabaseManager;
  redis?: RedisManager;
  container?: Container;
  cache?: CacheStore;
}): {
  manager: QueueManager;
  dispatcher: Dispatcher;
  processor: QueueProcessor;
  registry: JobRegistry;
  batchRepository?: BatchRepository;
} {
  const registry = options.registry;
  const batchRepository = options.cache ? new BatchRepository(options.cache) : undefined;
  const worker = new QueueWorker(registry, options.container, { batchRepository });
  const manager = new QueueManager(options.config, worker, options.database, options.redis);
  const dispatcher = new Dispatcher(manager.connection(), batchRepository);
  const processor = new QueueProcessor(manager, registry, worker);

  return { manager, dispatcher, processor, registry, batchRepository };
}

export { DatabaseQueue } from './database-queue.js';
export { RedisQueue } from './redis-queue.js';
export { isWorkerQueue } from './worker-queue.js';
export type { WorkerQueue } from './worker-queue.js';
export { BatchRepository, PendingBatch, type BatchState } from './batch.js';
export { Chain } from './chain.js';
export { Dispatcher } from './dispatcher.js';
export {
  FailedJobRepository,
  formatJobException,
  newFailedJobUuid,
} from './failed-job-repository.js';
export { Job } from './job.js';
export { JobNotFoundException, JobRegistry } from './registry.js';
export { decodePayload, encodePayload, serializeJob } from './payload.js';
export type { QueueContract } from './queue-contract.js';
export { QueueManager } from './queue-manager.js';
export { QueueProcessor } from './queue-processor.js';
export { SyncQueue } from './sync-queue.js';
export type {
  DatabaseQueueConnectionConfig,
  FailedJobRecord,
  FailedJobsConfig,
  QueueConfig,
  QueueConnectionConfig,
  QueueJobRecord,
  SerializedJobPayload,
  RedisQueueConnectionConfig,
  SyncQueueConnectionConfig,
} from './types.js';
export {
  QueueWorker,
  setQueueWorkerProcessHook,
  type QueueWorkerProcessHook,
  type QueueWorkerProcessResult,
} from './worker.js';