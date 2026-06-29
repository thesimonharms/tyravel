import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  AuthServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  ServiceProvider,
} from '@pondoknusa/core';
import type { AuthConfig } from '@pondoknusa/auth';
import { DatabaseSessionStore } from '@pondoknusa/auth';
import { DatabaseManager } from '@pondoknusa/database';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider } from '../project-bootstrap.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class SessionPruneCommand extends Command {
  override readonly name = 'session:prune';
  override readonly description = 'Prune expired database sessions';
  override readonly usage = 'pondoknusa session:prune';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadConfig(root);

    if (!config.auth) {
      console.error('Auth config not found. Add config/auth.ts to your app.');
      return 1;
    }

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);
    app.register(AuthServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const authConfig = config.auth as AuthConfig;
    if ((authConfig.session.driver ?? 'database') !== 'database') {
      console.error('session:prune only supports the database session driver.');
      return 1;
    }

    const database = app.make<DatabaseManager>('db');
    const store = new DatabaseSessionStore(
      database.connection(authConfig.session.connection),
      authConfig.session.table ?? 'sessions',
    );

    await store.pruneExpired(authConfig.session.lifetimeMinutes);
    console.log('Expired sessions pruned.');
    return 0;
  }
}