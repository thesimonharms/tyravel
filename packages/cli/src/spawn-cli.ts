import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

export function resolvePondoknusaBin(root: string): string {
  const name = process.platform === 'win32' ? 'pondoknusa.cmd' : 'pondoknusa';
  return join(root, 'node_modules', '.bin', name);
}

export function spawnPondoknusaCommand(
  root: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): ChildProcess {
  const bin = resolvePondoknusaBin(root);
  return spawn(bin, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
}