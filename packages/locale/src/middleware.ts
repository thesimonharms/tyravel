import type { Middleware, PondoknusaRequest } from '@pondoknusa/http';
import { parseAcceptLanguage } from './accept-language.js';
import { persistLocaleToSession, readUserLocale } from './user-locale.js';
import { readRouteLocale } from './route-locale.js';
import type { Translator } from './translator.js';

export interface SetLocaleMiddlewareOptions {
  translator: Translator;
  sessionKey?: string;
  queryKey?: string;
  routeParameter?: string;
  resolveLocale?: (request: PondoknusaRequest) => string | Promise<string | undefined> | undefined;
}

export function createSetLocaleMiddleware(
  options: SetLocaleMiddlewareOptions,
): Middleware {
  const sessionKey = options.sessionKey ?? 'locale';
  const queryKey = options.queryKey ?? 'locale';

  return async (request, next) => {
    const locale = await resolveRequestLocale(request, options, sessionKey, queryKey);
    if (locale) {
      options.translator.setLocale(locale);
      request.locale = locale;
    } else {
      request.locale = options.translator.getLocale();
    }

    return next();
  };
}

async function resolveRequestLocale(
  request: PondoknusaRequest,
  options: SetLocaleMiddlewareOptions,
  sessionKey: string,
  queryKey: string,
): Promise<string | undefined> {
  const available = options.translator.getAvailableLocales();
  const routeParameter = options.routeParameter ?? 'locale';

  const routeLocale = readRouteLocale(request, routeParameter, available);
  if (routeLocale) {
    persistLocaleToSession(request.session, routeLocale, sessionKey);
    return routeLocale;
  }

  if (options.resolveLocale) {
    const resolved = await options.resolveLocale(request);
    if (resolved) {
      const normalized = normalizeLocale(resolved, available);
      if (normalized) {
        persistLocaleToSession(request.session, normalized, sessionKey);
      }
      return normalized;
    }
  }

  const userLocale = readUserLocale(request.user);
  if (userLocale) {
    const normalized = normalizeLocale(userLocale, available);
    if (normalized) {
      persistLocaleToSession(request.session, normalized, sessionKey);
    }
    return normalized;
  }

  const sessionLocale = request.session?.get<string>(sessionKey);
  if (sessionLocale) {
    return normalizeLocale(sessionLocale, available);
  }

  const queryLocale = request.query(queryKey);
  if (queryLocale) {
    const normalized = normalizeLocale(queryLocale, available);
    if (normalized) {
      persistLocaleToSession(request.session, normalized, sessionKey);
    }
    return normalized;
  }

  const headerLocale = parseAcceptLanguage(
    request.headers.get('accept-language'),
    available,
  );
  if (headerLocale) {
    return headerLocale;
  }

  return undefined;
}

function normalizeLocale(
  locale: string,
  available: string[],
): string | undefined {
  const match = available.find(
    (entry) => entry.toLowerCase() === locale.toLowerCase(),
  );
  return match;
}