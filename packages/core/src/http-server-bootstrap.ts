import type { ConfigRepository } from '@pondoknusa/config';
import type { Application } from './application.js';
import { applyBootProfile } from './boot-profile.js';
import { startDevHotReload } from './dev-hot-reload.js';
import { registerHttpMiddleware } from './http-middleware.js';
import { bootstrapRouteCache } from './route-cache-bootstrap.js';

export interface PrepareHttpServerOptions {
  /** Enable config/route hot reload (default: non-production with PONDOKNUSA_HOT_RELOAD=1). */
  hotReload?: boolean;
}

export interface PrepareHttpServerResult {
  headless: boolean;
  routeCacheLoaded: boolean;
  routeCacheMessage?: string;
  configCacheLoaded: boolean;
  configCacheMessage?: string;
}

export function isProductionEnvironment(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

export async function prepareHttpServer(
  app: Application,
  config: ConfigRepository,
  options: PrepareHttpServerOptions = {},
): Promise<PrepareHttpServerResult> {
  const headless = await applyBootProfile(app, config);
  registerHttpMiddleware(app, config);

  const routeCache = await bootstrapRouteCache(app);
  if (routeCache.loaded && routeCache.message && !isProductionEnvironment()) {
    console.log(`[routes] ${routeCache.message}`);
  }

  let configCacheLoaded = false;
  let configCacheMessage: string | undefined;
  try {
    const configCache = app.make<{ loaded: boolean; message?: string }>('pondoknusa.configCache');
    configCacheLoaded = configCache.loaded;
    configCacheMessage = configCache.message;
    if (configCache.loaded && configCache.message && !isProductionEnvironment()) {
      console.log(`[config] ${configCache.message}`);
    }
  } catch {
    // ConfigServiceProvider not registered.
  }

  const hotReload =
    options.hotReload
    ?? (!isProductionEnvironment() && process.env.PONDOKNUSA_HOT_RELOAD === '1');

  if (hotReload) {
    startDevHotReload(app);
  }

  return {
    headless,
    routeCacheLoaded: routeCache.loaded,
    routeCacheMessage: routeCache.message,
    configCacheLoaded,
    configCacheMessage,
  };
}