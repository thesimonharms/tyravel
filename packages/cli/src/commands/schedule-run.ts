import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  Schedule,
  ScheduleServiceProvider,
  ServiceProvider,
} from '@tyravel/core';
import { Command } from '../command.js';
import { createKernel } from '../kernel.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class ScheduleRunCommand extends Command {
  override readonly name = 'schedule:run';
  override readonly description = 'Run scheduled tasks that are due';
  override readonly usage = 'tyravel schedule:run';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(ScheduleServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const schedule = app.make<Schedule>('schedule');
    const due = schedule.getDueEvents();

    if (due.length === 0) {
      console.log('No scheduled tasks are due.');
      return 0;
    }

    const kernel = createKernel();

    for (const event of due) {
      console.log(`Running ${event.description} (${event.expression})`);

      if (event.type === 'command' && event.command) {
        const code = await kernel.run([event.command, ...(event.commandArgs ?? [])]);
        if (code !== 0) {
          return code;
        }
        continue;
      }

      await event.run?.();
    }

    return 0;
  }
}

async function importAppServiceProvider(
  root: string,
): Promise<Record<string, unknown> | undefined> {
  const providerPath = join(root, 'src/providers/app-service-provider.ts');
  const providerJsPath = join(root, 'src/providers/app-service-provider.js');

  for (const target of [providerJsPath, providerPath]) {
    try {
      const { access } = await import('node:fs/promises');
      await access(target);
      return import(pathToFileURL(target).href) as Promise<Record<string, unknown>>;
    } catch {
      continue;
    }
  }

  return undefined;
}