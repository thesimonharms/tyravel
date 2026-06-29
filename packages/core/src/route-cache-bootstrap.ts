import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RouteCacheManifest } from '@pondoknusa/http';
import type { Application } from './application.js';

export interface RouteCacheBootstrapResult {
  loaded: boolean;
  routeCount: number;
  message?: string;
}

function routeFingerprint(
  route: { method: string; pattern: string; middleware: string[] },
): string {
  const middleware = [...route.middleware].sort().join(',');
  return `${route.method}:${route.pattern}:${middleware}`;
}

function manifestFingerprints(manifest: RouteCacheManifest): string[] {
  return manifest.routes
    .map((route) => routeFingerprint(route))
    .sort();
}

export async function bootstrapRouteCache(
  app: Application,
  options: { productionOnly?: boolean } = {},
): Promise<RouteCacheBootstrapResult> {
  const productionOnly = options.productionOnly ?? true;
  const environment = process.env.NODE_ENV ?? 'development';

  if (productionOnly && environment !== 'production') {
    return { loaded: false, routeCount: 0 };
  }

  const cachePath = join(app.basePath, 'storage/framework/routes.json');

  try {
    const raw = await readFile(cachePath, 'utf8');
    const manifest = JSON.parse(raw) as RouteCacheManifest;

    if (manifest.version !== 1 || !Array.isArray(manifest.routes)) {
      return {
        loaded: false,
        routeCount: 0,
        message: 'Invalid route cache manifest',
      };
    }

    const router = app.router();
    const current = router.exportRouteCache();
    const cached = manifestFingerprints(manifest);
    const live = manifestFingerprints(current);

    if (cached.length !== live.length || cached.some((entry, index) => entry !== live[index])) {
      return {
        loaded: false,
        routeCount: 0,
        message: 'Route cache is stale — run `pondoknusa route:cache`',
      };
    }

    router.warmRouteCache();

    return {
      loaded: true,
      routeCount: manifest.routes.length,
      message: `Loaded ${manifest.routes.length} cached route(s)`,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { loaded: false, routeCount: 0 };
    }

    return {
      loaded: false,
      routeCount: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}