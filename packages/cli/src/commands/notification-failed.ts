import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  QueueServiceProvider,
  ServiceProvider,
  setQueueApplication,
} from '@pondoknusa/core';
import { FailedNotificationRepository } from '@pondoknusa/notifications';
import type { FailedJobRepository, QueueManager } from '@pondoknusa/queue';
import { decodePayload } from '@pondoknusa/queue';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class NotificationFailedCommand extends Command {
  override readonly name = 'notification:failed';
  override readonly description = 'List failed notification jobs';
  override readonly usage = 'pondoknusa notification:failed';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const app = await bootNotificationApp();
    if (!app) {
      return 1;
    }

    const failedJobs = app.make<FailedJobRepository>('queue.failed');
    const repository = new FailedNotificationRepository(failedJobs);
    const records = await repository.all();

    if (records.length === 0) {
      console.log('No failed notifications.');
      return 0;
    }

    for (const record of records) {
      console.log(`${record.id}\t${record.queue}\t${record.failedAt}\t${record.uuid}`);
    }

    return 0;
  }
}

export class NotificationRetryCommand extends Command {
  override readonly name = 'notification:retry';
  override readonly description = 'Retry a failed notification job by id';
  override readonly usage = 'pondoknusa notification:retry <id>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [idArg] = positionalArgs(args);
    const id = Number(idArg);

    if (!Number.isFinite(id)) {
      console.error('Provide a numeric failed notification id.');
      return 1;
    }

    const app = await bootNotificationApp();
    if (!app) {
      return 1;
    }

    const manager = app.make<QueueManager>('queue');
    const failedJobs = app.make<FailedJobRepository>('queue.failed');
    const repository = new FailedNotificationRepository(failedJobs);
    const record = await repository.find(id);

    if (!record) {
      console.error(`Failed notification [${id}] was not found.`);
      return 1;
    }

    const payload = decodePayload(record.payload);
    const connection = manager.connection(record.connection);
    await connection.pushRaw(payload, record.queue);
    await failedJobs.forget(id);
    console.log(`Retried failed notification [${id}].`);
    return 0;
  }
}

async function bootNotificationApp(): Promise<Application | null> {
  const root = await requireProjectRoot();
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