import { snakeCase } from '@tyravel/support';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { migration } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeMigrationCommand extends Command {
  override readonly name = 'make:migration';
  override readonly description = 'Create a new database migration';
  override readonly usage = 'tyravel make:migration <name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Migration name is required.');
      console.error('Usage: tyravel make:migration <name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const className = toPascalCase(rawName);
    const fileName = `${timestamp()}_${snakeCase(rawName)}.ts`;
    const target = projectPath(root, 'database/migrations', fileName);

    if (await pathExists(target)) {
      console.error(`Migration already exists: database/migrations/${fileName}`);
      return 1;
    }

    await writeFile(target, migration(className));
    console.log(`Migration created: database/migrations/${fileName}`);

    return 0;
  }
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('_');
}

