import type { Middleware, PondoknusaRequest } from '@pondoknusa/http';
import type { Translator } from './translator.js';

export interface RouteLocaleMiddlewareOptions {
  translator: Translator;
  parameter?: string;
  availableLocales: string[];
  sessionKey?: string;
}

export function createRouteLocaleMiddleware(
  options: RouteLocaleMiddlewareOptions,
): Middleware {
  const parameter = options.parameter ?? 'locale';
  const sessionKey = options.sessionKey ?? 'locale';

  return async (request, next) => {
    const value = request.param(parameter);
    if (value) {
      const locale = options.availableLocales.find(
        (entry) => entry.toLowerCase() === value.toLowerCase(),
      );
      if (locale) {
        options.translator.setLocale(locale);
        request.locale = locale;
        request.session?.put(sessionKey, locale);
      }
    }

    return next();
  };
}

export function readRouteLocale(
  request: PondoknusaRequest,
  parameter = 'locale',
  availableLocales: string[] = [],
): string | undefined {
  const value = request.param(parameter);
  if (!value) {
    return undefined;
  }

  return availableLocales.find(
    (entry) => entry.toLowerCase() === value.toLowerCase(),
  );
}