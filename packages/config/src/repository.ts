import { mergeConfig } from './merge.js';

export type ConfigTree = Record<string, unknown>;

function isMergeableObject(value: unknown): value is ConfigTree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class ConfigRepository {
  constructor(private readonly config: ConfigTree) {}

  all(): ConfigTree {
    return this.config;
  }

  set(key: string, value: unknown): void {
    const segments = key.split('.');
    if (segments.length === 1) {
      this.config[key] = value;
      return;
    }

    let current = this.config;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index]!;
      if (!isMergeableObject(current[segment])) {
        current[segment] = {};
      }
      current = current[segment] as ConfigTree;
    }

    current[segments[segments.length - 1]!] = value;
  }

  merge(key: string, defaults: unknown): void {
    const existing = this.has(key) ? this.get(key) : {};
    const merged = mergeConfig(
      isMergeableObject(defaults) ? defaults : {},
      isMergeableObject(existing) ? existing : {},
    );
    this.set(key, merged);
  }

  get<T = unknown>(key: string, fallback?: T): T {
    const value = this.resolve(key);
    if (value === undefined) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`Config key not found: ${key}`);
    }
    return value as T;
  }

  has(key: string): boolean {
    return this.resolve(key) !== undefined;
  }

  private resolve(key: string): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object' && segment in current) {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, this.config);
  }
}