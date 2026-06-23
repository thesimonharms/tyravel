import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { Command } from '../command.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import {
  optionNumber,
  optionString,
  parseOptions,
  pathExists,
  positionalArgs,
} from '../utils.js';


export class ServeCommand extends Command {
  override readonly name = 'serve';
  override readonly description = 'Start the development server';
  override readonly usage = 'tyravel serve [--port=<port>] [--host=<hostname>]';

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
    const runtime = detectRuntime();

    if (!runtime) {
      console.error('No supported TypeScript runtime found. Install Bun or use Node 20+.');
      return 1;
    }

    console.log(`Starting Tyravel server using ${runtime.name}...`);

    const child = spawn(
      runtime.command,
      runtime.args(entry, port, hostname),
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          TYRAVEL_PORT: String(port),
          TYRAVEL_HOST: hostname,
          TYRAVEL_VIEW_WATCH: '1',
        },
      },
    );

    return await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1));
      child.on('error', (error) => {
        console.error(error.message);
        resolve(1);
      });
    });
  }
}

interface Runtime {
  name: string;
  command: string;
  args: (entry: string, port: number, hostname: string) => string[];
}

function detectRuntime(): Runtime | undefined {
  if (process.versions.bun) {
    return {
      name: 'Bun',
      command: process.execPath,
      args: (entry) => ['run', entry],
    };
  }

  if (commandExists('bun')) {
    return {
      name: 'Bun',
      command: 'bun',
      args: (entry) => ['run', entry],
    };
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= 22) {
    return {
      name: 'Node',
      command: process.execPath,
      args: (entry) => ['--experimental-strip-types', entry],
    };
  }

  return undefined;
}

function commandExists(command: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(which, [command], { stdio: 'ignore' });
  return result.status === 0;
}