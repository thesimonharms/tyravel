import { isAbsolute, join } from 'node:path';
import type { Application } from './application.js';

export abstract class ServiceProvider {
  constructor(protected readonly app: Application) {}

  register(): void | Promise<void> {}

  boot(): void | Promise<void> {}

  protected loadMigrationsFrom(path: string): void {
    const resolved = isAbsolute(path) ? path : join(this.app.basePath, path);
    this.app.addMigrationPath(resolved);
  }
}