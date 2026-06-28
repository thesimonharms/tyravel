import { join } from 'node:path';
import { Command } from '../command.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import { detectTypeScriptRuntime, spawnTypeScriptEntry } from '../runtime.js';
import {
  optionNumber,
  optionString,
  parseOptions,
  pathExists,
  positionalArgs,
} from '../utils.js';

export class StartCommand extends Command {
  override readonly name = 'start';
  override readonly description = 'Start the production server';
  override readonly usage = 'tyravel start [--port=<port>] [--host=<hostname>]';

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

    const port = optionNumber(options, 'port', config.serve.port);
    const hostname = optionString(options, 'host', config.serve.hostname) ?? config.serve.hostname;
    const runtime = detectTypeScriptRuntime();

    if (!runtime) {
      console.error('No supported TypeScript runtime found. Install Bun or use Node.js 26+.');
      return 1;
    }

    console.log(`Starting Tyravel production server using ${runtime.name}...`);

    const child = spawnTypeScriptEntry({
      entry,
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? 'production',
        TYRAVEL_PORT: String(port),
        TYRAVEL_HOST: hostname,
      },
    });

    return await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1));
      child.on('error', (error) => {
        console.error(error.message);
        resolve(1);
      });
    });
  }
}