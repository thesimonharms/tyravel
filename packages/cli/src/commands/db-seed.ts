import { join } from 'node:path';
import { loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
} from '@tyravel/core';
import { SeederRunner } from '@tyravel/database';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { optionString, parseOptions, positionalArgs } from '../utils.js';

export class DbSeedCommand extends Command {
  override readonly name = 'db:seed';
  override readonly description = 'Seed the database with records';
  override readonly usage = 'tyravel db:seed [--class=DatabaseSeeder]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadConfig(root);

    const className = optionString(options, 'class', 'DatabaseSeeder') ?? 'DatabaseSeeder';

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);
    await app.boot();

    const runner = new SeederRunner(join(root, 'database/seeders'));

    try {
      const ran = await runner.run(className);
      console.log(`Database seeded: ${ran}`);
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      return 1;
    }
  }
}