import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { jobsTableMigration } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, writeFile, pathExists } from '../utils.js';

export class QueueTableCommand extends Command {
  override readonly name = 'queue:table';
  override readonly description = 'Create a migration for the queue jobs table';
  override readonly usage = 'tyravel queue:table';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const fileName = `${timestamp()}_create_jobs_table.ts`;
    const target = projectPath(root, 'database/migrations', fileName);

    if (await pathExists(target)) {
      console.error(`Migration already exists: database/migrations/${fileName}`);
      return 1;
    }

    await writeFile(target, jobsTableMigration());
    console.log(`Migration created: database/migrations/${fileName}`);
    console.log('Run tyravel migrate to create the jobs table.');

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