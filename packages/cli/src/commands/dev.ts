import { join } from 'node:path';
import { Command } from '../command.js';
import { startDevServer } from '../dev-server.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import { parseOptions, pathExists, positionalArgs } from '../utils.js';

export class DevCommand extends Command {
  override readonly name = 'dev';
  override readonly description = 'Start the local development server with hot reload';
  override readonly usage =
    'pondoknusa dev [--port=<port>] [--host=<hostname>] [--tls] [--no-queue] [--no-watch]';

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

    const { code } = await startDevServer({ root, cliArgs: args, options });
    return code;
  }
}