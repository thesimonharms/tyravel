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

export class RouteListCommand extends Command {
  override readonly name = 'route:list';
  override readonly description = 'List all registered routes';
  override readonly usage = 'pondoknusa route:list [--json] [--middleware=name] [--name=route.name] [--action=Controller]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
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

    const routes = app.router().listRoutes({
      middleware: options.middleware as string | undefined,
      name: options.name as string | undefined,
      action: options.action as string | undefined,
    });

    if (routes.length === 0) {
      console.log('No routes registered.');
      return 0;
    }

    if (options.json) {
      console.log(JSON.stringify(routes, null, 2));
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