import { Container } from '@tyravel/container';
import type { Abstract, Constructor, Factory } from '@tyravel/container';
import type { ConfigRepository } from '@tyravel/config';
import {
  createRouter,
  MiddlewareRegistry,
  type MiddlewareInput,
  type RouteHandler,
  type Router,
} from '@tyravel/http';
import { createControllerHandler, isControllerAction } from './controller.js';
import { ServiceProvider } from './service-provider.js';

type ProviderConstructor = new (app: Application) => ServiceProvider;

export class Application extends Container {
  private providers: ProviderConstructor[] = [];
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