import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  type ServiceProvider,
} from '@pondoknusa/core';

async function importIfExists(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    const { access } = await import('node:fs/promises');
    await access(path);
    return import(pathToFileURL(path).href) as Promise<Record<string, unknown>>;
  } catch {
    return undefined;
  }
}

export interface ListedRoute {
  method: string;
  uri: string;
  action: string;
  name?: string;
}

export async function listProjectRoutes(
  projectRoot: string,
  existingApp?: Application,
): Promise<ListedRoute[]> {
  await loadConfig(projectRoot, { validate: false });

  const app = existingApp ?? new Application(projectRoot);
  setRouteApplication(app);

  if (!existingApp) {
    app.register(ConfigServiceProvider);

    const providerModule = await importIfExists(
      join(projectRoot, 'src/providers/app-service-provider.ts'),
    ) ?? await importIfExists(join(projectRoot, 'src/providers/app-service-provider.js'));

    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();
  }

  const routesModule =
    (await importIfExists(join(projectRoot, 'src/routes/index.ts')))
    ?? (await importIfExists(join(projectRoot, 'src/routes/index.js')))
    ?? (await importIfExists(join(projectRoot, 'src/routes/web.ts')))
    ?? (await importIfExists(join(projectRoot, 'src/routes/web.js')));

  if (typeof routesModule?.registerRoutes === 'function') {
    routesModule.registerRoutes();
  }

  return app.router().listRoutes();
}