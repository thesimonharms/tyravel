import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Seeder } from './seeder.js';

export class SeederRunner {
  constructor(private readonly seedersPath: string) {}

  async run(className = 'DatabaseSeeder'): Promise<string> {
    const SeederClass = await this.resolve(className);
    const seeder = new SeederClass();
    await seeder.run();
    return className;
  }

  private async resolve(className: string): Promise<new () => Seeder> {
    for (const file of await this.files()) {
      const loaded = await this.load(file);
      const SeederClass = this.findSeederExport(loaded, className);
      if (SeederClass) {
        return SeederClass;
      }
    }

    throw new Error(`Seeder [${className}] not found in ${this.seedersPath}.`);
  }

  private findSeederExport(
    loaded: Record<string, unknown>,
    className: string,
  ): (new () => Seeder) | undefined {
    const named = loaded[className];
    if (typeof named === 'function') {
      return named as new () => Seeder;
    }

    const defaultExport = loaded.default;
    if (
      typeof defaultExport === 'function' &&
      (defaultExport as { name?: string }).name === className
    ) {
      return defaultExport as new () => Seeder;
    }

    return undefined;
  }

  private async files(): Promise<string[]> {
    try {
      const entries = await readdir(this.seedersPath);
      return entries
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();
    } catch {
      return [];
    }
  }

  private async load(file: string): Promise<Record<string, unknown>> {
    const moduleUrl = pathToFileURL(join(this.seedersPath, file)).href;
    return import(moduleUrl) as Promise<Record<string, unknown>>;
  }
}