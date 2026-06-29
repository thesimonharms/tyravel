import { snakeCase } from '@pondoknusa/support';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { model, ulidModelMigration, uuidModelMigration } from '../stubs.js';
import {
  parseOptions,
  positionalArgs,
  projectPath,
  toPascalCase,
  writeFile,
  pathExists,
} from '../utils.js';

export class MakeModelCommand extends Command {
  override readonly name = 'make:model';
  override readonly description = 'Create a new Eloquent model class';
  override readonly usage = 'pondoknusa make:model <Name> [--uuid] [--ulid] [--migration]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Model name is required.');
      console.error('Usage: pondoknusa make:model <Name> [--uuid] [--ulid] [--migration]');
      return 1;
    }

    if (options.uuid === true && options.ulid === true) {
      console.error('Choose either --uuid or --ulid, not both.');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName);
    const fileName = `${name}.ts`;
    const target = projectPath(root, 'src/models', fileName);

    if (await pathExists(target)) {
      console.error(`Model already exists: src/models/${fileName}`);
      return 1;
    }

    const keyType = options.ulid === true ? 'ulid' : options.uuid === true ? 'uuid' : 'int';
    await writeFile(target, model(name, keyType));
    console.log(`Model created: src/models/${fileName}`);

    if (options.migration === true && keyType !== 'int') {
      const table = `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;
      const migrationName = `create_${snakeCase(table)}_table`;
      const migrationFile = `${timestamp()}_${migrationName}.ts`;
      const migrationTarget = projectPath(root, 'database/migrations', migrationFile);
      const contents =
        keyType === 'ulid' ? ulidModelMigration(table) : uuidModelMigration(table);
      await writeFile(migrationTarget, contents);
      console.log(`Migration created: database/migrations/${migrationFile}`);
    }

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