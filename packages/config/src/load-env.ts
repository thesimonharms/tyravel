import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface LoadEnvOptions {
  /** Path to the env file. Defaults to `<basePath>/.env`. */
  path?: string;
  /** When true, values from the file overwrite existing `process.env` entries. */
  override?: boolean;
}

export function loadEnv(basePath: string, options: LoadEnvOptions = {}): boolean {
  const envPath = options.path ?? join(basePath, '.env');

  if (!existsSync(envPath)) {
    return false;
  }

  const content = readFileSync(envPath, 'utf8');
  const variables = parseEnv(content);

  for (const [key, value] of Object.entries(variables)) {
    if (options.override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

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