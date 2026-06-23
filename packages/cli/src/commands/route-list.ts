import { loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  ServiceProvider,
} from '@tyravel/core';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider } from '../project-bootstrap.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class RouteListCommand extends Command {
  override readonly name = 'route:list';
  override readonly description = 'List all registered routes';
  override readonly usage = 'tyravel route:list';

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

    const routesModule = await importRoutes(root);
    routesModule?.registerRoutes?.();

    const routes = app.router().listRoutes();
    if (routes.length === 0) {
      console.log('No routes registered.');
      return 0;
    }

    for (const route of routes) {
      const name = route.name ? `  ${route.name}` : '';
      const middleware =
        route.middleware.length > 0 ? `  [${route.middleware.join(', ')}]` : '';
      console.log(`${route.method.padEnd(7)} ${route.uri.padEnd(28)} ${route.action}${name}${middleware}`);
    }

    return 0;
  }
}

async function importRoutes(
  root: string,
): Promise<{ registerRoutes?: () => void } | undefined> {
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const candidates = [
    join(root, 'src/routes/index.js'),
    join(root, 'src/routes/index.ts'),
    join(root, 'src/routes/web.js'),
    join(root, 'src/routes/web.ts'),
  ];

  for (const target of candidates) {
    try {
      const { access } = await import('node:fs/promises');
      await access(target);
      return import(pathToFileURL(target).href) as Promise<{ registerRoutes?: () => void }>;
    } catch {
      continue;
    }
  }

  return undefined;
}