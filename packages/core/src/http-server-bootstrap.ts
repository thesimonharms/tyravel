import type { ConfigRepository } from '@tyravel/config';
import type { Application } from './application.js';
import { applyBootProfile } from './boot-profile.js';
import { startDevHotReload } from './dev-hot-reload.js';
import { registerHttpMiddleware } from './http-middleware.js';
import { bootstrapRouteCache } from './route-cache-bootstrap.js';

export interface PrepareHttpServerOptions {
  /** Enable config/route hot reload (default: non-production with TYRAVEL_HOT_RELOAD=1). */
  hotReload?: boolean;
}

export interface PrepareHttpServerResult {
  headless: boolean;
  routeCacheLoaded: boolean;
  routeCacheMessage?: string;
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

  const hotReload =
    options.hotReload
    ?? (!isProductionEnvironment() && process.env.TYRAVEL_HOT_RELOAD === '1');

  if (hotReload) {
    startDevHotReload(app);
  }

  return {
    headless,
    routeCacheLoaded: routeCache.loaded,
    routeCacheMessage: routeCache.message,
  };
}