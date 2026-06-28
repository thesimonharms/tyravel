import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export interface TypeScriptRuntime {
  name: string;
  command: string;
  entryArgs: (entry: string) => string[];
}

export function detectTypeScriptRuntime(): TypeScriptRuntime | undefined {
  if (process.versions.bun) {
    return {
      name: 'Bun',
      command: process.execPath,
      entryArgs: (entry) => ['run', entry],
    };
  }

  if (commandExists('bun')) {
    return {
      name: 'Bun',
      command: 'bun',
      entryArgs: (entry) => ['run', entry],
    };
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= 26) {
    return {
      name: 'Node',
      command: process.execPath,
      entryArgs: (entry) => ['--experimental-strip-types', entry],
    };
  }

  return undefined;
}

export function spawnTypeScriptEntry(options: {
  entry: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): ChildProcess {
  const runtime = detectTypeScriptRuntime();
  if (!runtime) {
    throw new Error('No supported TypeScript runtime found. Install Bun or use Node.js 26+.');
  }

  return spawn(runtime.command, runtime.entryArgs(options.entry), {
    cwd: options.cwd,
    stdio: 'inherit',
    env: options.env ?? process.env,
  });
}

function commandExists(command: string): boolean {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(which, [command], { stdio: 'ignore' });
  return result.status === 0;
}