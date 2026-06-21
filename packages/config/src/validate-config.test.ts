import { describe, expect, it } from 'vitest';
import { ConfigValidationError } from './config-validation-error.js';
import { s } from './schema.js';
import { validateConfig } from './validate-config.js';

describe('validateConfig', () => {
  const appSchema = s.object({
    name: s.string({ required: true, minLength: 1 }),
    debug: s.boolean(),
    url: s.string({ url: true }),
  });

  it('passes when config matches schema', () => {
    expect(() =>
      validateConfig(
        {
          app: {
            name: 'Tyravel',
            debug: true,
            url: 'http://127.0.0.1:3000',
          },
        },
        { app: appSchema },
      ),
    ).not.toThrow();
  });

  it('throws ConfigValidationError for invalid values', () => {
    try {
      validateConfig(
        {
          app: {
            name: '',
            debug: 'yes',
            url: 'not-a-url',
          },
        },
        { app: appSchema },
      );
      expect.fail('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      const failures = (error as ConfigValidationError).failures.map((f) => f.path);
      expect(failures).toContain('name');
      expect(failures).toContain('debug');
      expect(failures).toContain('url');
    }
  });

  it('validates nested objects and records', () => {
    const databaseSchema = s.object({
      default: s.string({ enum: ['sqlite', 'mysql', 'postgres'] }),
      connections: s.record(
        s.object({
          driver: s.string({ required: true }),
          database: s.string({ required: true }),
        }),
      ),
    });

    expect(() =>
      validateConfig(
        {
          database: {
            default: 'sqlite',
            connections: {
              sqlite: { driver: 'sqlite', database: 'database/database.sqlite' },
            },
          },
        },
        { database: databaseSchema },
      ),
    ).not.toThrow();
  });
});