import { join } from 'node:path';
import { loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  ServiceProvider,
  setViewApplication,
  ViewServiceProvider,
} from '@tyravel/core';
import type { ViewEngine, ViewConfig } from '@tyravel/views';
import { importAppServiceProvider } from './project-bootstrap.js';
import { loadViewConfig } from './view-config.js';

export interface BootedViewApplication {
  app: Application;
  engine: ViewEngine;
  viewConfig: ViewConfig;
}

/**
 * Boot the Tyravel application so view commands use the same engine as HTTP
 * requests — custom directives, composers, component bindings, and injectors
 * registered in AppServiceProvider are available.
 */
export async function bootViewApplication(root: string): Promise<BootedViewApplication> {
  await loadConfig(root);
  const viewConfig = await loadViewConfig(root);

  const app = new Application(root);
  setViewApplication(app);
  app.register(ConfigServiceProvider);
  app.register(ViewServiceProvider);

  const providerModule = await importAppServiceProvider(root);
  if (providerModule?.AppServiceProvider) {
    const Provider = providerModule.AppServiceProvider as new (
      application: Application,
    ) => ServiceProvider;
    app.register(Provider);
  }

  await app.boot();

  return {
    app,
    engine: app.make<ViewEngine>('view'),
    viewConfig,
  };
}

export function enableCompiledCache(
  engine: ViewEngine,
  root: string,
  viewConfig: ViewConfig,
): void {
  const cachePath = join(root, viewConfig.compiledPath ?? 'storage/framework/views');
  engine.setCompiledCachePath(cachePath);
}