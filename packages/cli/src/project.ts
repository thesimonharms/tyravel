import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface TyravelConfig {
  name: string;
  entry: string;
  serve: {
    port: number;
    hostname: string;
  };
}

const PROJECT_MARKERS = ['tyravel.json', 'src/main.ts'] as const;

export function findProjectRoot(startDir = process.cwd()): string | undefined {
  let current = resolve(startDir);

  while (true) {
    if (PROJECT_MARKERS.every((marker) => existsSync(join(current, marker)))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

export function loadProjectConfig(root: string): TyravelConfig {
  const configPath = join(root, 'tyravel.json');
  const raw = readFileSync(configPath, 'utf8');
  try {
    return JSON.parse(raw) as TyravelConfig;
  } catch {
    throw new Error(`Invalid JSON in ${configPath}`);
  }
}

export function requireProjectRoot(startDir = process.cwd()): string {
  const root = findProjectRoot(startDir);
  if (!root) {
    throw new Error(
      'Could not find a Tyravel project. Run this command from an app directory or use `tyravel new`.',
    );
  }
  return root;
}