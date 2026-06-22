import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Application } from './application.js';

/**
 * Base class for Tyravel service providers.
 *
 * Override {@link register} to bind services into the container and
 * {@link boot} for work that depends on other providers having registered.
 *
 * Both hooks are **async-first**: use `async register()` / `async boot()` when
 * performing I/O (config, filesystem, database). {@link Application.boot} always
 * `await`s each hook in registration order. Synchronous overrides remain
 * supported for non-blocking setup only.
 */
export abstract class ServiceProvider {
  constructor(protected readonly app: Application) {}

  /**
   * Register container bindings. Called for every provider in registration
   * order before any provider's {@link boot} runs.
   */
  register(): void | Promise<void> {}

  /**
   * Boot the provider after all {@link register} hooks have completed.
   * Called in registration order.
   */
  boot(): void | Promise<void> {}

  protected loadMigrationsFrom(path: string): void {
    const resolved = isAbsolute(path) ? path : join(this.app.basePath, path);
    this.app.addMigrationPath(resolved);
  }

  protected async mergeConfigFrom(path: string, key: string): Promise<void> {
    const resolved = isAbsolute(path) ? path : join(this.app.basePath, path);
    const moduleUrl = pathToFileURL(resolved).href;
    const loaded = await import(moduleUrl);
    const defaults = loaded.default ?? loaded;
    this.app.mergeConfig(key, defaults);
  }
}