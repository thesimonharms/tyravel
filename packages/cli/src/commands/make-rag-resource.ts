import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { ragIngestJob, ragResourceMigration, ragResourceModel } from '../stubs-ai.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeRagResourceCommand extends Command {
  override readonly name = 'make:rag-resource';
  override readonly description = 'Scaffold a RAG model, migration, and ingest job';
  override readonly usage = 'pondoknusa make:rag-resource <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Resource name is required.');
      console.error('Usage: pondoknusa make:rag-resource <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName);
    const fileName = `${name}.ts`;
    const modelTarget = projectPath(root, 'src/models', fileName);
    const jobTarget = projectPath(root, 'src/jobs', `Ingest${name}.ts`);
    const migrationFile = `${timestamp()}_create_${toTableName(name)}_table.ts`;
    const migrationTarget = projectPath(root, 'database/migrations', migrationFile);

    if (await pathExists(modelTarget)) {
      console.error(`Model already exists: src/models/${fileName}`);
      return 1;
    }

    await writeFile(modelTarget, ragResourceModel(name));
    await writeFile(jobTarget, ragIngestJob(name));
    await writeFile(migrationTarget, ragResourceMigration(name, migrationFile));

    console.log(`RAG model created: src/models/${fileName}`);
    console.log(`Ingest job created: src/jobs/Ingest${name}.ts`);
    console.log(`Migration created: database/migrations/${migrationFile}`);
    console.log('');
    console.log(`Register registerEmbedModel('${name}', ${name}) and EmbedChunksJob in your bootstrap.`);

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

function toTableName(name: string): string {
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;
}