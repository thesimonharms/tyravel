import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { loadConfig } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  ServiceProvider,
} from '@pondoknusa/core';
import { isPrunableModel, pruneModels } from '@pondoknusa/database';
import type { ModelStatic } from '@pondoknusa/database';
import { discoverModels } from '@pondoknusa/mcp';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider } from '../project-bootstrap.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class ModelPruneCommand extends Command {
  override readonly name = 'model:prune';
  override readonly description = 'Prune models that define a prunable() query';
  override readonly usage = 'pondoknusa model:prune';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const discovered = await discoverModels(root);
    const models: ModelStatic[] = [];

    for (const entry of discovered) {
      const module = await import(pathToFileURL(join(root, entry.file)).href);
      const ModelClass = module[entry.name] as ModelStatic | undefined;
      if (ModelClass && isPrunableModel(ModelClass)) {
        models.push(ModelClass);
      }
    }

    if (models.length === 0) {
      console.log('No prunable models found.');
      return 0;
    }

    const reports = await pruneModels(models);

    if (reports.length === 0) {
      console.log(`Checked ${models.length} prunable model(s); nothing to prune.`);
      return 0;
    }

    for (const report of reports) {
      console.log(`Pruned ${report.pruned} record(s) from ${report.model}.`);
    }

    return 0;
  }
}