import type { RouteParams } from '@pondoknusa/http';
import { signRouteUrl, temporarySignedRouteParams } from '@pondoknusa/http';
import type { Application } from './application.js';

let urlApplication: Application | undefined;

export function setUrlApplication(app: Application): void {
  urlApplication = app;
}

function router() {
  if (!urlApplication) {
    throw new Error('URL facade is not ready. Boot the application first.');
  }
  return urlApplication.router();
}

export interface UrlFacade {
  defaults(params: RouteParams): void;
  mergeDefaults(params: RouteParams): void;
  getDefaults(): RouteParams;
  route(name: string, params?: RouteParams | Record<string, unknown>): string;
  signed(name: string, params?: RouteParams | Record<string, unknown>): string;
  temporarySigned(
    name: string,
    ttlSeconds: number,
    params?: RouteParams | Record<string, unknown>,
  ): string;
}

export const URL: UrlFacade = {
  defaults: (params) => {
    router().setUrlDefaults(params);
  },
  mergeDefaults: (params) => {
    router().mergeUrlDefaults(params);
  },
  getDefaults: () => router().getUrlDefaults(),
  route: (name, params = {}) => router().url(name, params),
  signed: (name, params = {}) => {
    const appKey = resolveAppKey();
    const url = router().url(name, params);
    return signRouteUrl(`http://localhost${url}`, { secret: appKey }).replace('http://localhost', '');
  },
  temporarySigned: (name, ttlSeconds, params = {}) => {
    const appKey = resolveAppKey();
    const url = router().url(name, params);
    return signRouteUrl(`http://localhost${url}`, {
      secret: appKey,
      ...temporarySignedRouteParams(ttlSeconds),
    }).replace('http://localhost', '');
  },
};

function resolveAppKey(): string {
  if (!urlApplication) {
    throw new Error('URL facade is not ready. Boot the application first.');
  }

  try {
    const config = urlApplication.make<{ get: (key: string, fallback?: string) => string }>('config');
    const key = config.get('app.key');
    if (key) {
      return key;
    }
  } catch {
    // Config may not be registered in lightweight tests.
  }

  return 'pondoknusa-app-key';
}