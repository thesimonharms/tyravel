import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  ServiceProvider,
} from '@pondoknusa/core';
import { DatabaseManager, Migrator } from '@pondoknusa/database';
import type { DatabaseConfig } from '@pondoknusa/database';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class MigrateCommand extends Command {
  override readonly name = 'migrate';
  override readonly description = 'Run database migrations';
  override readonly usage = 'pondoknusa migrate';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadConfig(root);
    const database = config.database as DatabaseConfig | undefined;

    if (!database) {
      console.error('Database config not found. Add config/database.ts to your app.');
      return 1;
    }

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const manager = app.make(DatabaseManager);
    const migrator = new Migrator(manager.connection(), app.migrationPaths());

    const ran = await migrator.run();

    if (ran.length === 0) {
      console.log('Nothing to migrate.');
      return 0;
    }

    console.log(`Migrated: ${ran.join(', ')}`);
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