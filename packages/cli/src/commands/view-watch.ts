import { createViewWatcher } from '@tyravel/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';
import { bootViewApplication, enableCompiledCache } from '../view-bootstrap.js';

export class ViewWatchCommand extends Command {
  override readonly name = 'view:watch';
  override readonly description = 'Watch Tyr templates and recompile on change';
  override readonly usage = 'tyravel view:watch';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = requireProjectRoot();
    const { engine, viewConfig } = await bootViewApplication(root);
    enableCompiledCache(engine, root, viewConfig);

    console.log('Watching Tyr templates for changes...');

    const watcher = createViewWatcher(engine, {
      onRecompiled: (viewName) => {
        console.log(`Recompiled ${viewName}`);
      },
      onError: (error) => {
        console.error(error.message);
      },
    });

    await new Promise<void>((resolve) => {
      const shutdown = (): void => {
        watcher.close();
        resolve();
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

    return 0;
  }
}