import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  ServiceProvider,
} from '@pondoknusa/core';
import { Command } from '../command.js';
import { isHeadlessProject } from '../headless-project.js';
import { routesToOpenApi } from '../openapi-export.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider, importProjectRoutes } from '../project-bootstrap.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class MakeOpenApiCommand extends Command {
  override readonly name = 'make:openapi';
  override readonly description = 'Export registered routes as an OpenAPI 3.0 stub';
  override readonly usage =
    'pondoknusa make:openapi [--stdout] [--output=<path>] [--server=<url>]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadConfig(root);
    const headless = await isHeadlessProject(root);

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

    const routes = app.router().listRoutes();
    if (routes.length === 0) {
      console.error('No routes registered — add routes under src/routes/ first.');
      return 1;
    }

    const appConfig = config.app as { name?: string; url?: string } | undefined;
    const serverUrl =
      (options.server as string | undefined)
      ?? appConfig?.url
      ?? 'http://127.0.0.1:3000';

    const document = routesToOpenApi(routes, {
      title: appConfig?.name ?? 'Pondoknusa API',
      serverUrl,
    });

    const output = `${JSON.stringify(document, null, 2)}\n`;

    if (options.stdout === true) {
      console.log(output);
      return 0;
    }

    const target =
      (options.output as string | undefined)
      ?? join(root, 'storage/api/openapi.json');

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, output, 'utf8');

    console.log(`OpenAPI stub written to ${target}`);
    if (headless) {
      console.log('Headless tip: import this file into Postman, Stoplight, or your API gateway.');
    }

    return 0;
  }
}