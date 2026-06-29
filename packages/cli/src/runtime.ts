import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export const NODE_REQUIREMENT_URL = 'https://pondoknusa.dev/guide/deployment#before-you-deploy';

export interface TypeScriptRuntime {
  name: string;
  command: string;
  entryArgs: (entry: string) => string[];
  detail: string;
}

export function detectTypeScriptRuntime(): TypeScriptRuntime | undefined {
  if (process.versions.bun) {
    return {
      name: 'Bun',
      command: process.execPath,
      entryArgs: (entry) => ['run', entry],
      detail: `Bun ${process.versions.bun} (native TypeScript)`,
    };
  }

  if (commandExists('bun')) {
    return {
      name: 'Bun',
      command: 'bun',
      entryArgs: (entry) => ['run', entry],
      detail: 'Bun (native TypeScript)',
    };
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= 26) {
    return {
      name: 'Node',
      command: process.execPath,
      entryArgs: (entry) => ['--experimental-strip-types', entry],
      detail: `Node.js ${process.versions.node} (--experimental-strip-types)`,
    };
  }

  return undefined;
}

export function describeRuntimeIssue(): string {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= 26) {
    return 'No supported TypeScript runtime found. Install Bun or use Node.js 26+.';
  }

  return [
    `Node.js ${process.versions.node} is not supported for local development.`,
    'Pondoknusa requires Node.js 26+ or Bun.',
    `See ${NODE_REQUIREMENT_URL}`,
  ].join('\n');
}

export function printRuntimeInfo(runtime: TypeScriptRuntime): void {
  console.log(`Runtime: ${runtime.detail}`);
}

export function spawnTypeScriptEntry(options: {
  entry: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): ChildProcess {
  const runtime = detectTypeScriptRuntime();
  if (!runtime) {
    throw new Error(describeRuntimeIssue());
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