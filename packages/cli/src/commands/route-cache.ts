import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  ServiceProvider,
} from '@pondoknusa/core';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider, importProjectRoutes } from '../project-bootstrap.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class RouteCacheCommand extends Command {
  override readonly name = 'route:cache';
  override readonly description = 'Compile and cache the route manifest for production boot';
  override readonly usage = 'pondoknusa route:cache';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    setRouteApplication(app);
    app.register(ConfigServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const routesModule = await importProjectRoutes(root);
    routesModule?.registerRoutes?.();

    const manifest = app.router().warmRouteCache().exportRouteCache();
    const targetDir = join(root, 'storage', 'framework');
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      join(targetDir, 'routes.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    console.log(`Cached ${manifest.routes.length} route(s) to storage/framework/routes.json`);
    return 0;
  }
}

export class RouteClearCommand extends Command {
  override readonly name = 'route:clear';
  override readonly description = 'Remove the cached route manifest';
  override readonly usage = 'pondoknusa route:clear';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const target = join(root, 'storage', 'framework', 'routes.json');

    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(target);
      console.log('Route cache cleared.');
    } catch {
      console.log('No route cache found.');
    }

    return 0;
  }
}