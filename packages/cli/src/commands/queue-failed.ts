import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  QueueServiceProvider,
  ServiceProvider,
  setQueueApplication,
} from '@tyravel/core';
import type { FailedJobRepository } from '@tyravel/queue';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class QueueFailedCommand extends Command {
  override readonly name = 'queue:failed';
  override readonly description = 'List failed queue jobs';
  override readonly usage = 'tyravel queue:failed';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const app = await bootQueueApp();
    if (!app) {
      return 1;
    }

    let failedJobs: FailedJobRepository;
    try {
      failedJobs = app.make<FailedJobRepository>('queue.failed');
    } catch {
      console.error('Failed job repository is not configured (database + queue.failed).');
      return 1;
    }

    const records = await failedJobs.all();
    if (records.length === 0) {
      console.log('No failed jobs.');
      return 0;
    }

    for (const record of records) {
      console.log(
        `${record.id}\t${record.connection}\t${record.queue}\t${record.failedAt}\t${record.uuid}`,
      );
    }

    return 0;
  }
}

export class QueueRetryCommand extends Command {
  override readonly name = 'queue:retry';
  override readonly description = 'Retry a failed queue job by id';
  override readonly usage = 'tyravel queue:retry <id>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [idArg] = positionalArgs(args);
    const id = Number(idArg);

    if (!Number.isFinite(id)) {
      console.error('Provide a numeric failed job id.');
      return 1;
    }

    const app = await bootQueueApp();
    if (!app) {
      return 1;
    }

    const manager = app.make<import('@tyravel/queue').QueueManager>('queue');
    const failedJobs = app.make<FailedJobRepository>('queue.failed');

    const record = await failedJobs.find(id);
    if (!record) {
      console.error(`Failed job not found: ${id}`);
      return 1;
    }

    const queue = manager.connection(record.connection);
    const retried = await failedJobs.retry(id, async (payload, queueName) => {
      if ('pushRaw' in queue && typeof queue.pushRaw === 'function') {
        await queue.pushRaw(payload, queueName);
        return;
      }
      throw new Error('Retry requires a queue connection that supports pushRaw');
    });

    if (!retried) {
      console.error(`Could not retry failed job: ${id}`);
      return 1;
    }

    console.log(`Retried failed job ${id} onto queue=${record.queue}`);
    return 0;
  }
}

export class QueueFailedTableCommand extends Command {
  override readonly name = 'queue:failed-table';
  override readonly description = 'Create a migration for the failed_jobs table';
  override readonly usage = 'tyravel queue:failed-table';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = requireProjectRoot();
    const fileName = `${timestamp()}_create_failed_jobs_table.ts`;
    const target = join(root, 'database/migrations', fileName);

    const { existsSync } = await import('node:fs');
    if (existsSync(target)) {
      console.error(`Migration already exists: database/migrations/${fileName}`);
      return 1;
    }

    const { writeFile, projectPath } = await import('../utils.js');
    const { failedJobsTableMigration } = await import('../stubs.js');
    writeFile(projectPath(root, 'database/migrations', fileName), failedJobsTableMigration());
    console.log(`Migration created: database/migrations/${fileName}`);
    console.log('Run tyravel migrate to create the failed_jobs table.');

    return 0;
  }
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('_');
}

async function bootQueueApp(): Promise<Application | null> {
  const root = requireProjectRoot();
  await loadConfig(root);

  const app = new Application(root);
  setQueueApplication(app);
  app.register(ConfigServiceProvider);
  app.register(DatabaseServiceProvider);
  app.register(QueueServiceProvider);

  const providerPath = join(root, 'src/providers/app-service-provider.ts');
  const providerJsPath = join(root, 'src/providers/app-service-provider.js');
  const target = (await fileExists(providerJsPath)) ? providerJsPath : providerPath;
  const providerModule = (await import(pathToFileURL(target).href)) as Record<string, unknown>;
  const Provider = providerModule.AppServiceProvider as new (app: Application) => ServiceProvider;

  if (typeof Provider !== 'function') {
    console.error('AppServiceProvider export not found');
    return null;
  }

  app.register(Provider);
  await app.boot();
  return app;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const { access } = await import('node:fs/promises');
    await access(path);
    return true;
  } catch {
    return false;
  }
}