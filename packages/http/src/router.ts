import { TyravelRequest } from './request.js';
import { Response } from './response.js';
import {
  MethodNotAllowedException,
} from './http-exception.js';
import {
  joinRoutePaths,
  RouteGroupBuilder,
  type Groupable,
  type MiddlewareGroupable,
  type Routable,
  type RouteScope,
  type ScopedRouteRegistrar,
} from './route-group.js';
import {
  MiddlewareRegistry,
  type MiddlewareInput,
} from './middleware-registry.js';
import type {
  HttpMethod,
  Middleware,
  RouteDefinition,
  RouteHandler,
  RouteParams,
} from './types.js';

export class RouteNotFoundException extends Error {
  constructor(method: string, path: string) {
    super(`Route not found: ${method} ${path}`);
    this.name = 'RouteNotFoundException';
  }
}

interface CompiledRoute {
  definition: RouteDefinition;
  regex: RegExp;
  paramNames: string[];
}

class RouteRegistrar implements ScopedRouteRegistrar {
  constructor(
    private readonly router: Router,
    private readonly method: HttpMethod,
    private readonly middleware: MiddlewareInput[] = [],
  ) {}

  get(pattern: string, handler: RouteHandler): Routable {
    return this.router.add(this.method, pattern, handler, this.middleware);
  }

  post(pattern: string, handler: RouteHandler): Routable {
    return this.router.add('POST', pattern, handler, this.middleware);
  }

  put(pattern: string, handler: RouteHandler): Routable {
    return this.router.add('PUT', pattern, handler, this.middleware);
  }

  patch(pattern: string, handler: RouteHandler): Routable {
    return this.router.add('PATCH', pattern, handler, this.middleware);
  }

  delete(pattern: string, handler: RouteHandler): Routable {
    return this.router.add('DELETE', pattern, handler, this.middleware);
  }
}

export class Router implements Routable {
  private routes: RouteDefinition[] = [];
  private namedRoutes = new Map<string, RouteDefinition>();
  private globalMiddleware: MiddlewareInput[] = [];
  private scopeStack: RouteScope[] = [];
  private readonly middlewareRegistry: MiddlewareRegistry;
  private handlerNormalizer: (handler: RouteHandler) => RouteHandler = (handler) => handler;

  constructor(middlewareRegistry = new MiddlewareRegistry()) {
    this.middlewareRegistry = middlewareRegistry;
  }

  getMiddlewareRegistry(): MiddlewareRegistry {
    return this.middlewareRegistry;
  }

  setHandlerNormalizer(normalizer: (handler: RouteHandler) => RouteHandler): this {
    this.handlerNormalizer = normalizer;
    return this;
  }

  prefix(prefix: string): MiddlewareGroupable {
    return new RouteGroupBuilder(this).prefix(prefix);
  }

  namePrefix(prefix: string): MiddlewareGroupable {
    return new RouteGroupBuilder(this).namePrefix(prefix);
  }

  group(callback: (routes: Groupable) => void): Routable {
    return new RouteGroupBuilder(this).group(callback);
  }

  middleware(...middleware: MiddlewareInput[]): ScopedRouteRegistrar {
    return new RouteRegistrar(this, 'GET', middleware);
  }

  runInScope(scope: RouteScope, callback: () => void): void {
    this.scopeStack.push(scope);
    try {
      callback();
    } finally {
      this.scopeStack.pop();
    }
  }

  get(pattern: string, handler: RouteHandler): Routable {
    return this.add('GET', pattern, handler);
  }

  post(pattern: string, handler: RouteHandler): Routable {
    return this.add('POST', pattern, handler);
  }

  put(pattern: string, handler: RouteHandler): Routable {
    return this.add('PUT', pattern, handler);
  }

  patch(pattern: string, handler: RouteHandler): Routable {
    return this.add('PATCH', pattern, handler);
  }

  delete(pattern: string, handler: RouteHandler): Routable {
    return this.add('DELETE', pattern, handler);
  }

  use(...middleware: MiddlewareInput[]): Routable {
    this.globalMiddleware.push(...middleware);
    return this;
  }

  add(
    method: HttpMethod,
    pattern: string,
    handler: RouteHandler,
    middleware: MiddlewareInput[] = [],
  ): Routable {
    return this.addScoped({ prefix: '', middleware: [] }, method, pattern, handler, middleware);
  }

  addScoped(
    scope: RouteScope,
    method: HttpMethod,
    pattern: string,
    handler: RouteHandler,
    middleware: MiddlewareInput[] = [],
  ): Routable {
    const activeScope = this.mergeScopes([...this.scopeStack, scope]);
    const fullPattern = joinRoutePaths(activeScope.prefix, pattern);

    this.routes.push({
      method,
      pattern: fullPattern,
      handler: this.handlerNormalizer(handler),
      middleware: this.resolveMiddleware([
        ...this.globalMiddleware,
        ...activeScope.middleware,
        ...middleware,
      ]),
      name: undefined,
      namePrefix: activeScope.namePrefix,
    });

    return this;
  }

  name(name: string): Routable {
    const route = this.routes.at(-1);
    if (!route) {
      throw new Error('Cannot name a route before defining one.');
    }

    const scopedName = route.namePrefix ? `${route.namePrefix}${name}` : name;

    route.name = scopedName;
    this.namedRoutes.set(scopedName, route);
    return this;
  }

  url(name: string, params: RouteParams = {}): string {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Named route not found: ${name}`);
    }

    return route.pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error(`Missing route parameter: ${key}`);
      }
      return encodeURIComponent(value);
    });
  }

  async dispatch(request: Request): Promise<Response> {
    const compiled = this.compile();
    const url = new URL(request.url);
    const method = request.method.toUpperCase() as HttpMethod;

    let pathMatched = false;
    const allowedMethods: string[] = [];

    for (const route of compiled) {
      const match = route.regex.exec(url.pathname);
      if (!match) {
        continue;
      }

      if (route.definition.method !== method) {
        pathMatched = true;
        if (!allowedMethods.includes(route.definition.method)) {
          allowedMethods.push(route.definition.method);
        }
        continue;
      }

      const params = this.extractParams(route.paramNames, match);
      const tyravelRequest = new TyravelRequest(
        request,
        params,
        route.definition.name,
      );

      return this.runPipeline(tyravelRequest, route.definition);
    }

    if (pathMatched) {
      throw new MethodNotAllowedException(method, url.pathname, allowedMethods);
    }

    throw new RouteNotFoundException(method, url.pathname);
  }

  private async runPipeline(
    request: TyravelRequest,
    route: RouteDefinition,
  ): Promise<Response> {
    const middleware = route.middleware;
    let index = -1;

    const next = async (): Promise<Response> => {
      index += 1;

      if (index < middleware.length) {
        const current = middleware[index];
        if (!current) {
          return next();
        }
        return current(request, next);
      }

      const result = await route.handler(request);
      return this.normalizeResponse(result);
    };

    return next();
  }

  private normalizeResponse(result: Response): Response {
    return result;
  }

  private resolveMiddleware(inputs: MiddlewareInput[]): Middleware[] {
    return this.middlewareRegistry.resolveMany(inputs);
  }

  private mergeScopes(scopes: RouteScope[]): RouteScope {
    return scopes.reduce<RouteScope>(
      (merged, scope) => ({
        prefix: joinRoutePaths(merged.prefix, scope.prefix),
        middleware: [...merged.middleware, ...scope.middleware],
        namePrefix: scope.namePrefix ?? merged.namePrefix,
      }),
      { prefix: '', middleware: [] },
    );
  }

  private compile(): CompiledRoute[] {
    return this.routes.map((definition) => {
      const paramNames: string[] = [];
      const pattern = definition.pattern
        .replace(/\/+$/, '')
        .replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
          paramNames.push(name);
          return '([^/]+)';
        });

      const normalizedPattern = pattern === '' ? '/' : pattern;
      const regex = new RegExp(`^${normalizedPattern}/?$`);

      return {
        definition,
        regex,
        paramNames,
      };
    });
  }

  private extractParams(names: string[], match: RegExpExecArray): RouteParams {
    const params: RouteParams = {};

    for (const [index, name] of names.entries()) {
      const value = match[index + 1];
      if (value !== undefined) {
        params[name] = decodeURIComponent(value);
      }
    }

    return params;
  }
}

export function createRouter(middlewareRegistry?: MiddlewareRegistry): Router {
  return new Router(middlewareRegistry);
}

export type {
  Groupable,
  MiddlewareGroupable,
  Routable,
  RouteScope,
  ScopedRouteRegistrar,
} from './route-group.js';