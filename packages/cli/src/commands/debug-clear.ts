import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { pathExists, projectPath } from '../utils.js';

export class DebugClearCommand extends Command {
  override readonly name = 'debug:clear';
  override readonly description = 'Clear persisted Pondoknusa debug entries';
  override readonly usage = 'pondoknusa debug:clear';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();
    let cleared = 0;
    const targets = [
      projectPath(root, '.pondoknusa/debug-entries.json'),
      join(root, 'debug-entries.json'),
      projectPath(root, '.pondoknusa/debug-correlations.json'),
      join(root, 'debug-correlations.json'),
    ];

    for (const target of targets) {
      if (await pathExists(target)) {
        await unlink(target);
        cleared += 1;
        console.log(`Cleared ${target.replace(`${root}/`, '')}`);
      }
    }

    if (cleared === 0) {
      console.log('No persisted debug entries found.');
    }

    return 0;
  }
}