import type { Container } from '@tyravel/container';
import type { DatabaseManager } from '@tyravel/database';
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
  container?: Container;
}): {
  manager: QueueManager;
  dispatcher: Dispatcher;
  processor: QueueProcessor;
  registry: JobRegistry;
} {
  const registry = options.registry;
  const worker = new QueueWorker(registry, options.container);
  const manager = new QueueManager(options.config, worker, options.database);
  const dispatcher = new Dispatcher(manager.connection());
  const processor = new QueueProcessor(manager, registry, worker);

  return { manager, dispatcher, processor, registry };
}

export { DatabaseQueue } from './database-queue.js';
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
  SyncQueueConnectionConfig,
} from './types.js';
export { QueueWorker } from './worker.js';