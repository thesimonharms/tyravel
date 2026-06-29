import { afterEach, describe, expect, it } from 'vitest';
import { ConfigValidationError } from './config-validation-error.js';
import { env, envBool, envInt, requiredEnv } from './env.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('env', () => {
  it('returns defaults and casts booleans and numbers', () => {
    process.env.APP_DEBUG = 'true';
    process.env.APP_PORT = '3000';
    process.env.APP_NAME = 'Pondoknusa';

    expect(env('APP_NAME')).toBe('Pondoknusa');
    expect(env('MISSING', 'fallback')).toBe('fallback');
    expect(env('APP_DEBUG', false)).toBe(true);
    expect(env('APP_PORT', 8080)).toBe(3000);
    expect(env('EMPTY', 'default')).toBe('default');
  });

  it('throws when required env vars are missing', () => {
    delete process.env.APP_KEY;
    expect(() => requiredEnv('APP_KEY')).toThrow(ConfigValidationError);
    expect(() => requiredEnv('APP_KEY')).toThrow(/APP_KEY/);
  });

  it('provides typed helpers', () => {
    process.env.FEATURE_FLAG = 'yes';
    process.env.RETRIES = '3';

    expect(envBool('FEATURE_FLAG')).toBe(true);
    expect(envBool('MISSING')).toBe(false);
    expect(envInt('RETRIES', 1)).toBe(3);
    expect(envInt('MISSING', 5)).toBe(5);
  });
});