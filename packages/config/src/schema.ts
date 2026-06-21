import type { ConfigValidationFailure } from './config-validation-error.js';

export interface ConfigSchema {
  readonly required: boolean;
  validate(value: unknown, path: string): ConfigValidationFailure[];
}

interface StringOptions {
  required?: boolean;
  enum?: readonly string[];
  url?: boolean;
  minLength?: number;
}

interface NumberOptions {
  required?: boolean;
  min?: number;
  max?: number;
}

interface BooleanOptions {
  required?: boolean;
}

function invalid(path: string, config: string, message: string): ConfigValidationFailure {
  return { config, path, message };
}

function splitPath(path: string): { config: string; fieldPath: string } {
  const dot = path.indexOf('.');
  if (dot === -1) {
    return { config: path, fieldPath: '' };
  }
  return { config: path.slice(0, dot), fieldPath: path.slice(dot + 1) };
}

function fail(path: string, message: string): ConfigValidationFailure {
  const { config, fieldPath } = splitPath(path);
  return invalid(fieldPath || path, config, message);
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function createStringSchema(options: StringOptions = {}): ConfigSchema {
  const required = options.required ?? false;
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (typeof value !== 'string') {
        return [fail(path, 'must be a string')];
      }
      if (options.minLength !== undefined && value.length < options.minLength) {
        return [fail(path, `must be at least ${options.minLength} characters`)];
      }
      if (options.enum && !options.enum.includes(value)) {
        return [fail(path, `must be one of: ${options.enum.join(', ')}`)];
      }
      if (options.url) {
        try {
          const parsed = new URL(value);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return [fail(path, 'must be a valid http or https URL')];
          }
        } catch {
          return [fail(path, 'must be a valid URL')];
        }
      }
      return [];
    },
  };
}

function createNumberSchema(options: NumberOptions = {}): ConfigSchema {
  const required = options.required ?? false;
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return [fail(path, 'must be a number')];
      }
      if (options.min !== undefined && value < options.min) {
        return [fail(path, `must be at least ${options.min}`)];
      }
      if (options.max !== undefined && value > options.max) {
        return [fail(path, `must be at most ${options.max}`)];
      }
      return [];
    },
  };
}

function createBooleanSchema(options: BooleanOptions = {}): ConfigSchema {
  const required = options.required ?? false;
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (typeof value !== 'boolean') {
        return [fail(path, 'must be a boolean')];
      }
      return [];
    },
  };
}

function createObjectSchema(shape: Record<string, ConfigSchema>, required = true): ConfigSchema {
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        return [fail(path, 'must be an object')];
      }

      const record = value as Record<string, unknown>;
      const failures: ConfigValidationFailure[] = [];

      for (const [key, fieldSchema] of Object.entries(shape)) {
        const childPath = path ? `${path}.${key}` : key;
        failures.push(...fieldSchema.validate(record[key], childPath));
      }

      return failures;
    },
  };
}

function createRecordSchema(valueSchema: ConfigSchema, required = true): ConfigSchema {
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        return [fail(path, 'must be an object')];
      }

      const failures: ConfigValidationFailure[] = [];
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        failures.push(...valueSchema.validate(entry, `${path}.${key}`));
      }
      return failures;
    },
  };
}

function createArraySchema(itemSchema: ConfigSchema, required = true): ConfigSchema {
  return {
    required,
    validate(value, path) {
      if (isMissing(value)) {
        return required ? [fail(path, 'is required')] : [];
      }
      if (!Array.isArray(value)) {
        return [fail(path, 'must be an array')];
      }

      const failures: ConfigValidationFailure[] = [];
      value.forEach((item, index) => {
        failures.push(...itemSchema.validate(item, `${path}.${index}`));
      });
      return failures;
    },
  };
}

function createOptionalSchema(inner: ConfigSchema): ConfigSchema {
  return {
    required: false,
    validate(value, path) {
      if (isMissing(value)) {
        return [];
      }
      return inner.validate(value, path);
    },
  };
}

export const s = {
  string: (options: StringOptions = {}) => createStringSchema(options),
  number: (options: NumberOptions = {}) => createNumberSchema(options),
  boolean: (options: BooleanOptions = {}) => createBooleanSchema(options),
  object: (shape: Record<string, ConfigSchema>) => createObjectSchema(shape),
  record: (valueSchema: ConfigSchema) => createRecordSchema(valueSchema),
  array: (itemSchema: ConfigSchema) => createArraySchema(itemSchema),
  optional: (inner: ConfigSchema) => createOptionalSchema(inner),
};