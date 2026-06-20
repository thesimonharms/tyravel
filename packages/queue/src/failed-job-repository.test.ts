import { describe, expect, it } from 'vitest';
import type { DatabaseConnection } from '@tyravel/database';
import { SchemaBuilder, SqliteConnection } from '@tyravel/database';
import { DatabaseQueue } from './database-queue.js';
import { FailedJobRepository } from './failed-job-repository.js';
import { Job } from './job.js';
import { JobRegistry } from './registry.js';
import { QueueManager } from './queue-manager.js';
import { QueueProcessor } from './queue-processor.js';
import type { QueueConfig } from './types.js';
import { QueueWorker } from './worker.js';

class ExplodingJob extends Job<{ message: string }> {
  override async handle(): Promise<void> {
    throw new Error(this.data.message);
  }
}

function asDatabaseManager(connection: DatabaseConnection) {
  return {
    connection: () => connection,
  } as import('@tyravel/database').DatabaseManager;
}

async function createJobsTable(connection: DatabaseConnection) {
  const schema = new SchemaBuilder(connection);
  await schema.create('jobs', (table) => {
    table.id();
    table.string('queue');
    table.text('payload');
    table.integer('attempts');
    table.integer('reserved_at').nullable();
    table.integer('available_at');
    table.integer('created_at');
  });
}

async function createFailedJobsTable(connection: DatabaseConnection) {
  const schema = new SchemaBuilder(connection);
  await schema.create('failed_jobs', (table) => {
    table.id();
    table.string('uuid');
    table.string('connection');
    table.string('queue');
    table.text('payload');
    table.text('exception');
    table.integer('failed_at');
  });
}

describe('FailedJobRepository', () => {
  it('records permanently failed jobs and supports retry', async () => {
    const connection = new SqliteConnection(':memory:');
    await createJobsTable(connection);
    await createFailedJobsTable(connection);

    const failedJobs = new FailedJobRepository(connection);
    const registry = new JobRegistry().register(ExplodingJob);
    const worker = new QueueWorker(registry, undefined, { maxAttempts: 1 });
    const config: QueueConfig = {
      default: 'database',
      connections: {
        database: { driver: 'database', table: 'jobs' },
      },
    };

    const manager = new QueueManager(config, worker, asDatabaseManager(connection));
    const queue = manager.connection('database') as DatabaseQueue;
    await queue.push(new ExplodingJob({ message: 'boom' }));

    const processor = new QueueProcessor(manager, registry, worker, { failedJobs });
    await processor.run({ connection: 'database', maxJobs: 1, sleepSeconds: 0 });

    const failed = await failedJobs.all();
    expect(failed).toHaveLength(1);
    expect(failed[0]?.queue).toBe('default');
    expect(failed[0]?.exception).toContain('boom');

    const retried = await failedJobs.retry(failed[0]!.id, async (payload, queueName) => {
      await queue.pushRaw(payload, queueName);
    });

    expect(retried).toBe(true);
    expect(await failedJobs.all()).toHaveLength(0);

    const record = await queue.pop('default');
    expect(record).not.toBeNull();
  });
});