import {
  createCorsMiddleware,
  createThrottleMiddleware,
  createTrustedProxiesMiddleware,
  registerThrottlePresets,
  type CorsOptions,
  type ThrottlePresetMap,
} from '@tyravel/http';
import type { ConfigRepository } from '@tyravel/config';
import type { Application } from './application.js';

export interface CorsConfig extends CorsOptions {
  enabled?: boolean;
}

export interface HttpConfig {
  trustedProxies?: string[];
  /** Skip session/CSRF/view middleware on stateless JSON routes (default: true). */
  jsonFastPath?: boolean;
  /** Return minimal 404/405 JSON without exception handler (default: !app.debug). */
  early404?: boolean;
  throttle?: {
    enabled?: boolean;
    limit: number;
    windowMs: number;
    limits?: ThrottlePresetMap;
  };
}

export function registerHttpMiddleware(
  app: Application,
  config: ConfigRepository,
): void {
  const corsConfig = config.get<CorsConfig | undefined>('cors');
  if (corsConfig && corsConfig.enabled !== false) {
    app.use(createCorsMiddleware(corsConfig));
  }

  const httpConfig = config.get<HttpConfig | undefined>('http');
  if (httpConfig?.trustedProxies?.length) {
    app.use(createTrustedProxiesMiddleware({ proxies: httpConfig.trustedProxies }));
  }

  if (httpConfig?.jsonFastPath === false) {
    app.router().setJsonFastPath(false);
  }

  const appDebug = config.get<boolean>('app.debug', false);
  const early404 = httpConfig?.early404 ?? !appDebug;
  if (early404) {
    app.router().setEarly404(true);
  }

  if (httpConfig?.throttle && httpConfig.throttle.enabled !== false) {
    app.use(
      createThrottleMiddleware({
        limit: httpConfig.throttle.limit,
        windowMs: httpConfig.throttle.windowMs,
      }),
    );

    if (httpConfig.throttle.limits) {
      registerThrottlePresets((name, middleware) => {
        app.middleware(name, middleware);
      }, httpConfig.throttle.limits);
    }
  }
}