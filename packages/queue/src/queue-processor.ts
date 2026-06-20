import { DatabaseQueue } from './database-queue.js';
import type { FailedJobRepository } from './failed-job-repository.js';
import {
  formatJobException,
  newFailedJobUuid,
} from './failed-job-repository.js';
import { JobRegistry } from './registry.js';
import { QueueManager } from './queue-manager.js';
import { QueueWorker } from './worker.js';

export interface QueueWorkerRunOptions {
  connection?: string;
  queue?: string;
  sleepSeconds?: number;
  maxJobs?: number;
}

export interface QueueProcessorOptions {
  failedJobs?: FailedJobRepository;
}

export class QueueProcessor {
  constructor(
    private readonly manager: QueueManager,
    private readonly registry: JobRegistry,
    private readonly worker: QueueWorker,
    private readonly options: QueueProcessorOptions = {},
  ) {}

  async run(options: QueueWorkerRunOptions = {}): Promise<number> {
    const connectionName = options.connection ?? this.manager.getDefaultConnection();
    const queueName = options.queue ?? 'default';
    const sleepSeconds = options.sleepSeconds ?? 1;
    const maxJobs = options.maxJobs;

    const connection = this.manager.connection(connectionName);
    if (!(connection instanceof DatabaseQueue)) {
      throw new Error('Queue worker only supports the database queue driver');
    }

    let processed = 0;

    while (maxJobs === undefined || processed < maxJobs) {
      const record = await connection.pop(queueName);
      if (!record) {
        await sleep(sleepSeconds * 1000);
        continue;
      }

      try {
        const payload = connection.decode(record);
        if (!this.registry.has(payload.job)) {
          throw new Error(`Job class not registered: ${payload.job}`);
        }
        await this.worker.process(payload);
        await connection.deleteJob(record.id);
      } catch (error) {
        if (record.attempts + 1 >= this.worker.getMaxAttempts()) {
          if (this.options.failedJobs) {
            await this.options.failedJobs.record({
              uuid: newFailedJobUuid(),
              connection: connectionName,
              queue: queueName,
              payload: record.payload,
              exception: formatJobException(error),
            });
          }
          await connection.deleteJob(record.id);
          process.stderr.write(`Job ${record.id} failed permanently: ${String(error)}\n`);
        } else {
          await connection.release(record.id, connection.getRetryAfter());
          process.stderr.write(`Job ${record.id} failed, released for retry: ${String(error)}\n`);
        }
      }

      processed += 1;
    }

    return processed;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}