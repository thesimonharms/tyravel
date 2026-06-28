import { TyravelRequest } from './request.js';
import { Response } from './response.js';
import {
  MethodNotAllowedException,
  NotFoundHttpException,
} from './http-exception.js';
import { normalizeRouteParams } from './route-params.js';
import {
  createRouteBinding,
  type RouteBinding,
  type RouteBindingResolver,
} from './route-binding.js';
import {
  joinRoutePaths,
  RouteGroupBuilder,
  type Groupable,
  type MiddlewareGroupable,
  type Routable,
  type RouteGroupOptions,
  type RouteScope,
  type ScopedRouteRegistrar,
} from './route-group.js';
import { applyRouteGroupOptions, flattenMiddlewareInputs } from './route-group-options.js';
import { throttleMiddlewareAlias } from './throttle.js';
import {
  filterFastPathMiddleware,
  qualifiesForJsonFastPath,
} from './json-fast-path.js';
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

export interface RouteCacheManifest {
  version: 1;
  routes: Array<{
    method: HttpMethod;
    pattern: string;
    name?: string;
    middleware: string[];
    action: string;
    paramNames: string[];
  }>;
}

export interface RouteListEntry {
  method: HttpMethod;
  uri: string;
  name?: string;
  middleware: string[];
  action: string;
  domain?: string;
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
  private urlDefaults: RouteParams = {};
  private readonly bindings = new Map<string, RouteBinding>();
  private readonly implicitBindings = new Map<string, RouteBinding>();
  private compiledCache: CompiledRoute[] | null = null;
  private readonly middlewareRegistry: MiddlewareRegistry;
  private handlerNormalizer: (handler: RouteHandler) => RouteHandler = (handler) => handler;
  private jsonFastPathEnabled = true;
  private early404Enabled = false;

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

  setJsonFastPath(enabled: boolean): this {
    this.jsonFastPathEnabled = enabled;
    return this;
  }

  isJsonFastPathEnabled(): boolean {
    return this.jsonFastPathEnabled;
  }

  setEarly404(enabled: boolean): this {
    this.early404Enabled = enabled;
    return this;
  }

  isEarly404Enabled(): boolean {
    return this.early404Enabled;
  }

  bind(parameter: string, binding: RouteBinding | RouteBindingResolver): this {
    const resolved = typeof binding === 'function'
      ? createRouteBinding(binding)
      : binding;
    this.bindings.set(parameter, resolved);
    return this;
  }

  registerImplicitBinding(parameter: string, binding: RouteBinding | RouteBindingResolver): this {
    const resolved = typeof binding === 'function'
      ? createRouteBinding(binding)
      : binding;
    this.implicitBindings.set(parameter, resolved);
    return this;
  }

  getBindings(): ReadonlyMap<string, RouteBinding> {
    return this.bindings;
  }

  prefix(prefix: string): MiddlewareGroupable {
    return new RouteGroupBuilder(this).prefix(prefix);
  }

  namePrefix(prefix: string): MiddlewareGroupable {
    return new RouteGroupBuilder(this).namePrefix(prefix);
  }

  group(
    options: RouteGroupOptions,
    callback: (routes: Groupable) => void,
  ): Routable;
  group(callback: (routes: Groupable) => void): Routable;
  group(
    optionsOrCallback: RouteGroupOptions | ((routes: Groupable) => void),
    maybeCallback?: (routes: Groupable) => void,
  ): Routable {
    if (typeof optionsOrCallback === 'function') {
      return new RouteGroupBuilder(this).group(optionsOrCallback);
    }

    const builder = applyRouteGroupOptions(new RouteGroupBuilder(this), optionsOrCallback);
    return builder.group(maybeCallback!);
  }

  middleware(...middleware: MiddlewareInput[]): ScopedRouteRegistrar {
    return new RouteRegistrar(this, 'GET', flattenMiddlewareInputs(...middleware));
  }

  runInScope(scope: RouteScope, callback: () => void): void {
    this.scopeStack.push(scope);
    try {
      callback();
    } finally {
      this.scopeStack.pop();
    }
  }

  hasActiveScope(): boolean {
    return this.scopeStack.length > 0;
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
    const fullPattern = normalizeRoutePattern(joinRoutePaths(activeScope.prefix, pattern));

    const middlewareInputs = [
      ...this.globalMiddleware,
      ...activeScope.middleware,
      ...middleware,
    ];

    this.routes.push({
      method,
      pattern: fullPattern,
      handler: this.handlerNormalizer(handler),
      handlerLabel: resolveHandlerLabel(handler),
      middleware: this.resolveMiddleware(middlewareInputs),
      middlewareLabels: middlewareInputs.map((input) => String(input)),
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

  throttle(preset: string): Routable {
    const route = this.routes.at(-1);
    if (!route) {
      throw new Error('Cannot throttle a route before defining one.');
    }

    const label = throttleMiddlewareAlias(preset);
    route.middlewareLabels = [...(route.middlewareLabels ?? []), label];
    route.middleware = [
      ...route.middleware,
      this.middlewareRegistry.resolve(label),
    ];
    return this;
  }

  listRoutes(filters: {
    middleware?: string;
    name?: string;
    action?: string;
  } = {}): RouteListEntry[] {
    return this.routes
      .map((route) => ({
        method: route.method,
        uri: route.pattern,
        name: route.name,
        middleware: route.middlewareLabels ?? [],
        action: route.handlerLabel ?? 'Closure',
      }))
      .filter((route) => {
        if (filters.middleware && !route.middleware.includes(filters.middleware)) {
          return false;
        }
        if (filters.name && route.name !== filters.name) {
          return false;
        }
        if (filters.action && !route.action.includes(filters.action)) {
          return false;
        }
        return true;
      });
  }

  exportRouteCache(): RouteCacheManifest {
    const compiled = this.compile();
    return {
      version: 1,
      routes: compiled.map((route) => ({
        method: route.definition.method,
        pattern: route.definition.pattern,
        name: route.definition.name,
        middleware: route.definition.middlewareLabels ?? [],
        action: route.definition.handlerLabel ?? 'Closure',
        paramNames: route.paramNames,
      })),
    };
  }

  warmRouteCache(): this {
    this.compiledCache = this.buildCompiledRoutes();
    return this;
  }

  clearRouteCache(): this {
    this.compiledCache = null;
    return this;
  }

  resetRoutes(): this {
    this.routes = [];
    this.namedRoutes.clear();
    this.compiledCache = null;
    this.scopeStack = [];
    return this;
  }

  setUrlDefaults(defaults: RouteParams): this {
    this.urlDefaults = { ...defaults };
    return this;
  }

  mergeUrlDefaults(defaults: RouteParams): this {
    this.urlDefaults = { ...this.urlDefaults, ...defaults };
    return this;
  }

  getUrlDefaults(): RouteParams {
    return { ...this.urlDefaults };
  }

  url(name: string, params: RouteParams | Record<string, unknown> = {}): string {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Named route not found: ${name}`);
    }

    const merged = {
      ...normalizeRouteParams(this.urlDefaults as Record<string, unknown>),
      ...normalizeRouteParams(params as Record<string, unknown>),
    };

    return route.pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      const value = merged[key];
      if (value === undefined) {
        throw new Error(`Missing route parameter: ${key}`);
      }
      return encodeURIComponent(String(value));
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
      const resolved = await this.resolveBindings(params);
      const tyravelRequest = new TyravelRequest(
        request,
        resolved,
        route.definition.name,
      );

      return this.runPipeline(tyravelRequest, route.definition);
    }

    if (pathMatched) {
      if (this.early404Enabled) {
        return this.shortCircuitNotAllowed(method, url.pathname, allowedMethods);
      }
      throw new MethodNotAllowedException(method, url.pathname, allowedMethods);
    }

    if (this.early404Enabled) {
      return this.shortCircuitNotFound(method, url.pathname);
    }

    throw new RouteNotFoundException(method, url.pathname);
  }

  private shortCircuitNotFound(method: string, path: string): Response {
    return Response.json(
      { message: `Route not found: ${method} ${path}`, status: 404 },
      { status: 404 },
    );
  }

  private shortCircuitNotAllowed(
    method: string,
    path: string,
    allowedMethods: string[],
  ): Response {
    return Response.json(
      { message: `Method not allowed: ${method} ${path}`, status: 405 },
      {
        status: 405,
        headers: { allow: allowedMethods.join(', ') },
      },
    );
  }

  private async runPipeline(
    request: TyravelRequest,
    route: RouteDefinition,
  ): Promise<Response> {
    const middleware = this.resolvePipelineMiddleware(route);
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

  private resolvePipelineMiddleware(route: RouteDefinition): Middleware[] {
    if (!this.jsonFastPathEnabled) {
      return route.middleware;
    }

    const labels = route.middlewareLabels ?? [];
    if (!qualifiesForJsonFastPath(route.method, labels)) {
      return route.middleware;
    }

    return filterFastPathMiddleware(route.middleware);
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

  private async resolveBindings(params: RouteParams): Promise<RouteParams> {
    const resolved: RouteParams = { ...params };

    for (const [name, value] of Object.entries(params)) {
      if (typeof value !== 'string') {
        continue;
      }

      const binding = this.bindings.get(name) ?? this.implicitBindings.get(name);
      if (!binding) {
        continue;
      }

      const result = await binding.resolve(value);
      if (result === null || result === undefined) {
        if (binding.required !== false) {
          throw new NotFoundHttpException(`No matching record for route parameter [${name}].`);
        }
        continue;
      }

      resolved[name] = result;
    }

    return resolved;
  }

  private compile(): CompiledRoute[] {
    if (this.compiledCache) {
      return this.compiledCache;
    }

    return this.buildCompiledRoutes();
  }

  private buildCompiledRoutes(): CompiledRoute[] {
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

function normalizeRoutePattern(pattern: string): string {
  return pattern.replace(/\{([A-Za-z0-9_]+)\}/g, ':$1');
}

function resolveHandlerLabel(handler: RouteHandler): string {
  if (Array.isArray(handler) && handler.length >= 2) {
    const [controller, method] = handler as unknown[];
    if (typeof controller === 'function' && typeof method === 'string') {
      return `${controller.name}@${method}`;
    }
  }

  if (typeof handler === 'function' && handler.name) {
    return handler.name;
  }

  return 'Closure';
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