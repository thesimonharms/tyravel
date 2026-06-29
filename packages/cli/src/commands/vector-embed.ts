import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  QueueServiceProvider,
  ServiceProvider,
  dispatch,
  setQueueApplication,
} from '@pondoknusa/core';
import {
  EmbedChunksJob,
  resolveEmbedModel,
} from '@pondoknusa/vector';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { optionNumber, optionString, parseOptions, positionalArgs } from '../utils.js';

const DEFAULT_BATCH_SIZE = 32;

export class VectorEmbedCommand extends Command {
  override readonly name = 'vector:embed';
  override readonly description = 'Queue embedding jobs for vector records missing embeddings';
  override readonly usage =
    'pondoknusa vector:embed --model=<Name> [--batch=32] [--queue=default] [--connection=database]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const modelName = optionString(options, 'model');
    if (!modelName) {
      console.error('The --model option is required.');
      console.error('Usage: pondoknusa vector:embed --model=<Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    setQueueApplication(app);

    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);
    app.register(QueueServiceProvider);

    const providerPath = join(root, 'src/providers/app-service-provider.ts');
    const providerJsPath = join(root, 'src/providers/app-service-provider.js');
    const providerModule = await importProvider(providerPath, providerJsPath);
    const Provider = providerModule.AppServiceProvider as new (
      app: Application,
    ) => ServiceProvider;

    if (typeof Provider !== 'function') {
      console.error('AppServiceProvider export not found in src/providers/app-service-provider');
      return 1;
    }

    app.register(Provider);
    await app.boot();

    const model = resolveEmbedModel(modelName);
    if (!model) {
      console.error(
        `Model [${modelName}] is not registered for embedding. Call registerEmbedModel() in your app bootstrap.`,
      );
      return 1;
    }

    const embeddingColumn = model.vectorColumn ?? 'embedding';
    const rows = await model.query().whereNull(embeddingColumn).get();
    if (rows.length === 0) {
      console.log(`No records without embeddings found for model [${modelName}].`);
      return 0;
    }

    const batchSize = optionNumber(options, 'batch', DEFAULT_BATCH_SIZE) ?? DEFAULT_BATCH_SIZE;
    const queue = optionString(options, 'queue', 'default') ?? 'default';
    const ids = rows
      .map((row) => row[model.primaryKey])
      .filter((id): id is number | string => id !== undefined && id !== null);

    let dispatched = 0;
    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const batch = ids.slice(offset, offset + batchSize);
      await dispatch(
        new EmbedChunksJob({
          model: modelName,
          ids: batch,
          embeddingColumn,
        }),
        queue,
      );
      dispatched += batch.length;
    }

    console.log(
      `Queued ${dispatched} record(s) for embedding on model [${modelName}] (queue=${queue}).`,
    );
    console.log('Run pondoknusa queue:work to process EmbedChunksJob payloads.');

    return 0;
  }
}

async function importProvider(tsPath: string, jsPath: string): Promise<Record<string, unknown>> {
  const target = (await fileExists(jsPath)) ? jsPath : tsPath;
  return import(pathToFileURL(target).href) as Promise<Record<string, unknown>>;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const { access } = await import('node:fs/promises');
    await access(path);
    return true;
  } catch {
    return false;
  }
}