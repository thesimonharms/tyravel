import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  formatDebugEntryLine,
  formatDebugExecutionLine,
  watchDebugEntries,
} from '@pondoknusa/debug';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, pathExists, projectPath } from '../utils.js';

export class DebugWatchCommand extends Command {
  override readonly name = 'debug:watch';
  override readonly description = 'Tail persisted debug entries while pondoknusa serve is running';
  override readonly usage = 'pondoknusa debug:watch [--correlations]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);

    const root = await requireProjectRoot();
    const entriesPath = await this.resolveEntriesPath(root);
    const correlationsPath = options.correlations
      ? await this.resolveCorrelationsPath(root)
      : undefined;

    await mkdir(join(entriesPath, '..'), { recursive: true });
    if (correlationsPath) {
      await mkdir(join(correlationsPath, '..'), { recursive: true });
    }

    console.log(`Watching ${entriesPath}${correlationsPath ? ` and ${correlationsPath}` : ''}...`);

    const watcher = watchDebugEntries(
      entriesPath,
      (entry) => {
        console.log(formatDebugEntryLine(entry));
      },
      {
        correlationsPath,
        onExecution: correlationsPath
          ? (execution) => {
              console.log(formatDebugExecutionLine(execution));
            }
          : undefined,
      },
    );

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

  private async resolveEntriesPath(root: string): Promise<string> {
    const preferred = projectPath(root, '.pondoknusa/debug-entries.json');
    if (await pathExists(preferred)) {
      return preferred;
    }

    const fallback = join(root, 'debug-entries.json');
    if (await pathExists(fallback)) {
      return fallback;
    }

    return preferred;
  }

  private async resolveCorrelationsPath(root: string): Promise<string> {
    const preferred = projectPath(root, '.pondoknusa/debug-correlations.json');
    if (await pathExists(preferred)) {
      return preferred;
    }

    const fallback = join(root, 'debug-correlations.json');
    if (await pathExists(fallback)) {
      return fallback;
    }

    return preferred;
  }
}