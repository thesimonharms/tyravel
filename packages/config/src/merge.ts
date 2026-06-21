import type { ConfigTree } from './repository.js';

function isMergeableObject(value: unknown): value is ConfigTree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeConfig(defaults: ConfigTree, overrides: ConfigTree): ConfigTree {
  const result: ConfigTree = { ...defaults };

  for (const [key, overrideValue] of Object.entries(overrides)) {
    const defaultValue = result[key];

    if (isMergeableObject(defaultValue) && isMergeableObject(overrideValue)) {
      result[key] = mergeConfig(defaultValue, overrideValue);
      continue;
    }

    result[key] = overrideValue;
  }

  return result;
}