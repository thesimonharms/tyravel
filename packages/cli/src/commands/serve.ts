import { join } from 'node:path';
import { Command } from '../command.js';
import { startDevServer } from '../dev-server.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import { parseOptions, pathExists, positionalArgs } from '../utils.js';

export class ServeCommand extends Command {
  override readonly name = 'serve';
  override readonly description = 'Start the development server';
  override readonly usage = 'pondoknusa serve [--port=<port>] [--host=<hostname>] [--tls]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadProjectConfig(root);
    const entry = join(root, config.entry);

    if (!(await pathExists(entry))) {
      console.error(`Entry file not found: ${config.entry}`);
      return 1;
    }

    console.log('Prefer `pondoknusa dev` for the canonical local workflow.');
    const { code } = await startDevServer({ root, cliArgs: args, options });
    return code;
  }
}