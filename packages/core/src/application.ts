import { Container } from '@pondoknusa/container';
import type { Abstract, Constructor, Factory } from '@pondoknusa/container';
import type { ConfigRepository } from '@pondoknusa/config';
import {
  createRouter,
  MiddlewareRegistry,
  type MiddlewareInput,
  type RouteHandler,
  type Router,
} from '@pondoknusa/http';
import { createControllerHandler, isControllerAction } from './controller.js';
import {
  bindingMatches,
  pathMatchesPrefix,
  resolveLazyRoutePrefixes,
  type LazyProviderRegistration,
  type ProviderConstructor,
} from './lazy-provider.js';
import { ServiceProvider } from './service-provider.js';
import { constants } from 'node:fs';
import { access, readdir } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface RegisterLazyOptions {
  routePrefixes?: LazyProviderRegistration['routePrefixes'];
  bootWhen?: LazyProviderRegistration['bootWhen'];
  commands?: string[];
  bindings?: Abstract[];
}

export class Application extends Container {
  private providers: ProviderConstructor[] = [];
  private readonly lazyProviders: LazyProviderRegistration[] = [];
  private readonly bootedLazyProviders = new Set<ProviderConstructor>();
  private booted = false;
  private readonly middlewareRegistry = new MiddlewareRegistry();
  private readonly registeredMigrationPaths: string[] = [];

  constructor(public readonly basePath: string = process.cwd()) {
    super();
    this.singleton('app', () => this);
    this.singleton('middleware', () => this.middlewareRegistry);
    this.singleton('router', () => {
      const router = createRouter(this.middlewareRegistry);
      router.setHandlerNormalizer((handler) => this.normalizeRouteHandler(handler));
      return router;
    });
  }

  middleware(name: string, middleware: Parameters<MiddlewareRegistry['alias']>[1]): this {
    this.middlewareRegistry.alias(name, middleware);
    return this;
  }

  use(...middleware: MiddlewareInput[]): this {
    this.router().use(...middleware);
    return this;
  }

  private normalizeRouteHandler(handler: RouteHandler): RouteHandler {
    if (isControllerAction(handler)) {
      return createControllerHandler(this, handler);
    }
    return handler;
  }

  register(provider: ProviderConstructor): this {
    this.providers.push(provider);
    return this;
  }

  registerLazy(provider: ProviderConstructor, options: RegisterLazyOptions = {}): this {
    this.lazyProviders.push({
      provider,
      routePrefixes: options.routePrefixes,
      bootWhen: options.bootWhen,
      commands: options.commands,
      bindings: options.bindings,
    });
    return this;
  }

  hasBootedLazyProvider(provider: ProviderConstructor): boolean {
    return this.bootedLazyProviders.has(provider);
  }

  async bootLazyProvider(provider: ProviderConstructor): Promise<void> {
    if (this.bootedLazyProviders.has(provider)) {
      return;
    }

    this.bootedLazyProviders.add(provider);
    const instance = new provider(this);
    await instance.register();
    await instance.boot();
  }

  async bootLazyProvidersForRequest(pathname: string): Promise<void> {
    for (const entry of this.lazyProviders) {
      if (this.bootedLazyProviders.has(entry.provider)) {
        continue;
      }

      const prefixes = resolveLazyRoutePrefixes(this, entry.routePrefixes);
      const routeMatch = prefixes.some((prefix) => pathMatchesPrefix(pathname, prefix));
      const bootWhen = entry.bootWhen?.(this) ?? false;

      if (routeMatch || bootWhen) {
        await this.bootLazyProvider(entry.provider);
      }
    }
  }

  async bootLazyProvidersForCommand(commandName: string): Promise<void> {
    for (const entry of this.lazyProviders) {
      if (this.bootedLazyProviders.has(entry.provider)) {
        continue;
      }

      if (entry.commands?.includes(commandName)) {
        await this.bootLazyProvider(entry.provider);
      }
    }
  }

  async bootLazyProvidersForBinding(abstract: Abstract): Promise<void> {
    for (const entry of this.lazyProviders) {
      if (this.bootedLazyProviders.has(entry.provider)) {
        continue;
      }

      if (entry.bindings?.some((binding) => bindingMatches(abstract, binding))) {
        await this.bootLazyProvider(entry.provider);
      }
    }
  }

  addMigrationPath(path: string): this {
    if (!this.registeredMigrationPaths.includes(path)) {
      this.registeredMigrationPaths.push(path);
    }
    return this;
  }

  migrationPaths(): string[] {
    return [...this.registeredMigrationPaths];
  }

  mergeConfig(key: string, defaults: unknown): this {
    this.make<ConfigRepository>('config').merge(key, defaults);
    return this;
  }

  /**
   * Boot all registered service providers.
   *
   * Runs two phases, each in registration order, awaiting every hook:
   * 1. `register()` on a fresh provider instance per registration
   * 2. `boot()` on a fresh provider instance per registration
   *
   * Prefer `async register()` / `async boot()` for I/O; synchronous hooks are
   * still supported when they do not block.
   */
  async boot(): Promise<void> {
    if (this.booted) {
      return;
    }

    for (const Provider of this.providers) {
      const provider = new Provider(this);
      await provider.register();
    }

    for (const Provider of this.providers) {
      const provider = new Provider(this);
      await provider.boot();
    }

    this.booted = true;
  }

  /** Discover and register all service providers in `app/providers/`. */
  async discoverProviders(): Promise<this> {
    const providersDir = join(this.basePath, 'app', 'providers');
    try {
      await access(providersDir, constants.F_OK);
    } catch {
      return this;
    }

    const entries = await readdir(providersDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort();

    for (const file of files) {
      try {
        const moduleUrl = pathToFileURL(join(providersDir, file)).href;
        const mod = await import(moduleUrl);
        // Look for the exported class that extends ServiceProvider
        for (const key of Object.keys(mod)) {
          const exported = mod[key];
          if (typeof exported === 'function' && /Provider$/i.test(key)) {
            this.register(exported);
            break;
          }
        }
      } catch (err) {
        console.error(`Failed to load provider: ${file}`, (err as Error).message);
      }
    }
    return this;
  }

  /** Discover and register console commands in `app/console/commands/`. */
  async discoverCommands(): Promise<string[]> {
    const cmdsDir = join(this.basePath, 'app', 'console', 'commands');
    try {
      await access(cmdsDir, constants.F_OK);
    } catch {
      return [];
    }

    const entries = await readdir(cmdsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name.replace(/\.ts$/, ''))
      .sort();
  }

  router(): Router {
    return this.make<Router>('router');
  }

  override bind<T>(abstract: Abstract<T>, factory: Factory<T> | Constructor<T>): this {
    return super.bind(abstract, factory);
  }

  override singleton<T>(
    abstract: Abstract<T>,
    factory: Factory<T> | Constructor<T>,
  ): this {
    return super.singleton(abstract, factory);
  }

  override instance<T>(abstract: Abstract<T>, instance: T): this {
    return super.instance(abstract, instance);
  }
}