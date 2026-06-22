import { constants } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface LoadEnvOptions {
  /** Path to the env file. Defaults to `<basePath>/.env`. */
  path?: string;
  /** When true, values from the file overwrite existing `process.env` entries. */
  override?: boolean;
}

export async function loadEnv(
  basePath: string,
  options: LoadEnvOptions = {},
): Promise<boolean> {
  const envPath = options.path ?? join(basePath, '.env');

  try {
    await access(envPath, constants.F_OK);
  } catch {
    return false;
  }

  const content = await readFile(envPath, 'utf8');
  applyEnvVariables(parseEnv(content), options.override);
  return true;
}

/**
 * @deprecated Use `await loadEnv()` instead. Removed in 1.0.0.
 */
export function loadEnvSync(
  basePath: string,
  options: LoadEnvOptions = {},
): boolean {
  const envPath = options.path ?? join(basePath, '.env');

  if (!existsSync(envPath)) {
    return false;
  }

  const content = readFileSync(envPath, 'utf8');
  applyEnvVariables(parseEnv(content), options.override);
  return true;
}

export function parseEnv(content: string): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const parsed = parseEnvLine(rawLine);
    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    variables[key] = value;
  }

  return variables;
}

function applyEnvVariables(
  variables: Record<string, string>,
  override = false,
): void {
  for (const [key, value] of Object.entries(variables)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  if (trimmed.startsWith('export ')) {
    return parseEnvLine(trimmed.slice('export '.length));
  }

  const separator = trimmed.indexOf('=');
  if (separator === -1) {
    return null;
  }

  const key = trimmed.slice(0, separator).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0];
    value = value.slice(1, -1);

    if (quote === '"') {
      value = value
        .replaceAll('\\n', '\n')
        .replaceAll('\\r', '\r')
        .replaceAll('\\t', '\t')
        .replaceAll('\\"', '"')
        .replaceAll('\\\\', '\\');
    }
  }

  return [key, value];
}