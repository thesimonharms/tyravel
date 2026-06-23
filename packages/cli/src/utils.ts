import { mkdirSync, writeFileSync as writeFileSyncFs } from 'node:fs';
import { access, mkdir, writeFile as writeFileAsync } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';

export function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFileAsync(path, contents, 'utf8');
}

/**
 * @deprecated Use `await writeFile()` instead. Removed in 1.0.0.
 */
export function writeFileSync(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSyncFs(path, contents, 'utf8');
}

export function projectPath(root: string, ...segments: string[]): string {
  return join(root, ...segments);
}

export function parseOptions(args: string[]): Record<string, string | boolean> {
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith('--')) {
      continue;
    }

    const body = token.slice(2);
    const equalsIndex = body.indexOf('=');

    if (equalsIndex !== -1) {
      const key = body.slice(0, equalsIndex);
      const value = body.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const key = body;
    const next = args[index + 1];

    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

export function positionalArgs(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));
}

export function optionFlag(
  options: Record<string, string | boolean>,
  key: string,
): boolean {
  return options[key] === true;
}

export function optionString(
  options: Record<string, string | boolean>,
  key: string,
  fallback?: string,
): string | undefined {
  const value = options[key];
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

export function optionNumber(
  options: Record<string, string | boolean>,
  key: string,
  fallback: number,
): number {
  const value = optionString(options, key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}