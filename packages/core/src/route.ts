import { localizedRouteGroup } from '@pondoknusa/locale';
import type { ModelStatic } from '@pondoknusa/database';
import type {
  Groupable,
  MiddlewareGroupable,
  MiddlewareInput,
  RouteBinding,
  RouteBindingResolver,
  RouteGroupOptions,
  RouteHandler,
  Routable,
  Router,
  ScopedRouteRegistrar,
} from '@pondoknusa/http';
import type { ControllerAction } from './controller.js';
import type { Application } from './application.js';
import { implicitBindingParameter, modelRouteBinding } from './route-model-binding.js';

let activeApp: Application | undefined;

export function setRouteApplication(app: Application): void {
  activeApp = app;
}

function router(): Router {
  if (!activeApp) {
    throw new Error(
      'Route facade is not ready. Boot the application and call setRouteApplication(app) before defining routes. See https://pondoknusa.dev/guide/application-structure.',
    );
  }
  return activeApp.router();
}

type RouteTarget = RouteHandler | ControllerAction;

function toHandler(handler: RouteTarget): RouteHandler {
  return handler as RouteHandler;
}

export interface RouteFacade {
  prefix(prefix: string): MiddlewareGroupable;
  namePrefix(prefix: string): MiddlewareGroupable;
  group(options: RouteGroupOptions, callback: (routes: Groupable) => void): Routable;
  group(callback: (routes: Groupable) => void): Routable;
  localize(callback: (routes: Groupable) => void): Routable;
  get(pattern: string, handler: RouteTarget): Routable;
  post(pattern: string, handler: RouteTarget): Routable;
  put(pattern: string, handler: RouteTarget): Routable;
  patch(pattern: string, handler: RouteTarget): Routable;
  delete(pattern: string, handler: RouteTarget): Routable;
  middleware(...middleware: MiddlewareInput[]): ScopedRouteRegistrar;
  use(...middleware: MiddlewareInput[]): Routable;
  name(name: string): Routable;
  throttle(preset: string): Routable;
  bind(parameter: string, binding: RouteBinding | RouteBindingResolver | ModelStatic): Routable;
  implicitModels(...models: ModelStatic[]): Routable;
  url(name: string, params?: Parameters<Router['url']>[1]): string;
}

export const Route: RouteFacade = {
  prefix: (prefix: string): MiddlewareGroupable => router().prefix(prefix),
  namePrefix: (prefix: string): MiddlewareGroupable => router().namePrefix(prefix),
  group: (
    optionsOrCallback: RouteGroupOptions | ((routes: Groupable) => void),
    maybeCallback?: (routes: Groupable) => void,
  ): Routable => {
    if (typeof optionsOrCallback === 'function') {
      return router().group(optionsOrCallback);
    }

    return router().group(optionsOrCallback, maybeCallback!);
  },
  localize: (callback: (routes: Groupable) => void): Routable => {
    localizedRouteGroup(router(), {}, callback);
    return router();
  },
  get: (pattern: string, handler: RouteTarget): Routable =>
    router().get(pattern, toHandler(handler)),
  post: (pattern: string, handler: RouteTarget): Routable =>
    router().post(pattern, toHandler(handler)),
  put: (pattern: string, handler: RouteTarget): Routable =>
    router().put(pattern, toHandler(handler)),
  patch: (pattern: string, handler: RouteTarget): Routable =>
    router().patch(pattern, toHandler(handler)),
  delete: (pattern: string, handler: RouteTarget): Routable =>
    router().delete(pattern, toHandler(handler)),
  middleware: (...middleware: MiddlewareInput[]): ScopedRouteRegistrar =>
    router().middleware(...middleware),
  use: (...middleware: MiddlewareInput[]): Routable => router().use(...middleware),
  name: (name: string): Routable => router().name(name),
  throttle: (preset: string): Routable => router().throttle(preset),
  bind: (parameter, binding): Routable => {
    const resolved = isModelStatic(binding) ? modelRouteBinding(binding) : binding;
    router().bind(parameter, resolved);
    return router();
  },
  implicitModels: (...models): Routable => {
    for (const model of models) {
      router().registerImplicitBinding(implicitBindingParameter(model), modelRouteBinding(model));
    }
    return router();
  },
  url: (name: string, params?) => router().url(name, params),
};

function isModelStatic(value: unknown): value is ModelStatic {
  return (
    typeof value === 'function' &&
    'find' in value &&
    typeof (value as ModelStatic).find === 'function' &&
    'table' in value
  );
}

/** Named route URL generation helper (alias for `Route.url` / `URL.route`). */
export function route(name: string, params?: Parameters<Router['url']>[1]): string {
  return router().url(name, params);
}