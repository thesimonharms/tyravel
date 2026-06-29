import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { pgvectorExtensionMigration } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, writeFile, pathExists } from '../utils.js';

export class VectorInstallCommand extends Command {
  override readonly name = 'vector:install';
  override readonly description = 'Create a migration that enables the pgvector extension';
  override readonly usage = 'pondoknusa vector:install';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const fileName = `${timestamp()}_enable_pgvector_extension.ts`;
    const target = projectPath(root, 'database/migrations', fileName);

    if (await pathExists(target)) {
      console.error(`Migration already exists: database/migrations/${fileName}`);
      return 1;
    }

    await writeFile(target, pgvectorExtensionMigration());
    console.log(`Migration created: database/migrations/${fileName}`);
    console.log('Run pondoknusa migrate on PostgreSQL to enable pgvector.');

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