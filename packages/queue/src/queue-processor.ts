import { isWorkerQueue } from './worker-queue.js';
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
    if (!isWorkerQueue(connection)) {
      throw new Error('Queue worker only supports database and redis queue drivers');
    }

    let processed = 0;
    let shouldQuit = false;
    let wakeup: (() => void) | undefined;

    const shutdown = () => {
      shouldQuit = true;
      if (wakeup) {
        wakeup();
      }
    };

    if (typeof process !== 'undefined') {
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    }

    try {
      while (!shouldQuit && (maxJobs === undefined || processed < maxJobs)) {
        const record = await connection.pop(queueName);
        if (!record) {
          if (sleepSeconds > 0) {
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(resolve, sleepSeconds * 1000);
              wakeup = () => {
                clearTimeout(timeout);
                resolve();
              };
            });
            wakeup = undefined;
          }
          continue;
        }

        try {
          const payload = connection.decode(record);
          if (!this.registry.has(payload.job)) {
            throw new Error(`Job class not registered: ${payload.job}`);
          }
          await this.worker.process(
            payload,
            async (next) => {
              await connection.pushRaw(next, queueName);
            },
            queueName,
          );
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
    } finally {
      if (typeof process !== 'undefined') {
        process.off('SIGTERM', shutdown);
        process.off('SIGINT', shutdown);
      }
    }

    return processed;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}