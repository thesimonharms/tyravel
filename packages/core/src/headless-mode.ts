import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConfigRepository } from '@pondoknusa/config';

export type HeadlessConfigSource =
  | ConfigRepository
  | {
      app?: { headless?: boolean };
    };

export function isHeadlessMode(config: HeadlessConfigSource): boolean {
  if ('get' in config && typeof config.get === 'function') {
    return config.get<boolean>('app.headless', false);
  }

  return (config as { app?: { headless?: boolean } }).app?.headless === true;
}

export async function resolveHeadlessMode(
  basePath: string,
  config?: HeadlessConfigSource,
): Promise<boolean> {
  if (config && isHeadlessMode(config)) {
    return true;
  }

  try {
    const raw = await readFile(join(basePath, 'pondoknusa.json'), 'utf8');
    const project = JSON.parse(raw) as { mode?: string };
    return project.mode === 'headless';
  } catch {
    return false;
  }
}