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
import type { QueueProcessor } from '@pondoknusa/queue';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import {
  optionNumber,
  optionString,
  parseOptions,
  positionalArgs,
} from '../utils.js';

export class QueueWorkCommand extends Command {
  override readonly name = 'queue:work';
  override readonly description = 'Process jobs from the queue';
  override readonly usage =
    'pondoknusa queue:work [--queue=default] [--connection=database] [--sleep=1]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    setQueueApplication(app);

    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);
    app.register(QueueServiceProvider);

    const providerPath = join(root, 'src/providers/app-service-provider.ts');
    const providerJsPath = join(root, 'src/providers/app-service-provider.js');
    const providerModule = await importProvider(providerPath, providerJsPath);
    const Provider = providerModule.AppServiceProvider as new (
      app: Application,
    ) => ServiceProvider;

    if (typeof Provider !== 'function') {
      console.error('AppServiceProvider export not found in src/providers/app-service-provider');
      return 1;
    }

    app.register(Provider);
    await app.boot();

    const queue = optionString(options, 'queue', 'default') ?? 'default';
    const connection = optionString(options, 'connection', 'database') ?? 'database';
    const sleepSeconds = optionNumber(options, 'sleep', 1);

    console.log(`Processing jobs on connection=${connection} queue=${queue}`);

    const processor = app.make<QueueProcessor>('queue.processor');
    await processor.run({ queue, connection, sleepSeconds });

    return 0;
  }
}

async function importProvider(tsPath: string, jsPath: string): Promise<Record<string, unknown>> {
  const target = (await fileExists(jsPath)) ? jsPath : tsPath;
  return import(pathToFileURL(target).href) as Promise<Record<string, unknown>>;
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