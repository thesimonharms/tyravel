import { ConfigValidationError } from './config-validation-error.js';
import type { ConfigSchema } from './schema.js';
import type { ConfigTree } from './repository.js';

export type ConfigSchemaMap = Record<string, ConfigSchema>;

export function validateConfig(
  config: ConfigTree,
  schemas: ConfigSchemaMap,
): void {
  const failures = collectConfigValidationFailures(config, schemas);
  if (failures.length > 0) {
    throw new ConfigValidationError(failures);
  }
}

export function collectConfigValidationFailures(
  config: ConfigTree,
  schemas: ConfigSchemaMap,
): import('./config-validation-error.js').ConfigValidationFailure[] {
  const failures: import('./config-validation-error.js').ConfigValidationFailure[] = [];

  for (const [key, schema] of Object.entries(schemas)) {
    failures.push(...schema.validate(config[key], key));
  }

  return failures;
}