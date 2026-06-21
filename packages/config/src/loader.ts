import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ConfigTree } from './repository.js';
import type { ConfigSchema } from './schema.js';
import { validateConfig } from './validate-config.js';

export interface LoadedConfig {
  config: ConfigTree;
  schemas: Record<string, ConfigSchema>;
}

export interface LoadConfigOptions {
  validate?: boolean;
}

export async function loadConfig(
  basePath: string,
  options: LoadConfigOptions = {},
): Promise<ConfigTree> {
  const loaded = await loadConfigWithSchemas(basePath);
  if (options.validate !== false && Object.keys(loaded.schemas).length > 0) {
    validateConfig(loaded.config, loaded.schemas);
  }
  return loaded.config;
}

export async function loadConfigWithSchemas(basePath: string): Promise<LoadedConfig> {
  const configDir = join(basePath, 'config');
  const entries = readdirSync(configDir, { withFileTypes: true });
  const config: ConfigTree = {};
  const schemas: Record<string, ConfigSchema> = {};

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(/^(.+)\.(ts|js|mjs)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    if (!key) {
      continue;
    }

    const moduleUrl = pathToFileURL(join(configDir, entry.name)).href;
    const loaded = await import(moduleUrl);
    config[key] = loaded.default ?? loaded;

    if (loaded.schema && typeof loaded.schema.validate === 'function') {
      schemas[key] = loaded.schema as ConfigSchema;
    }
  }

  return { config, schemas };
}