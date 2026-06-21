import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Application } from './application.js';

export abstract class ServiceProvider {
  constructor(protected readonly app: Application) {}

  register(): void | Promise<void> {}

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