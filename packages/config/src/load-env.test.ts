import { afterEach, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadEnv, parseEnv } from './load-env.js';

const fixturePath = fileURLToPath(
  new URL('./fixtures/.env.sample', import.meta.url),
);

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('parseEnv', () => {
  it('parses comments, quotes, exports, and escapes', () => {
    const parsed = parseEnv(`
# comment
APP_NAME=Pondoknusa
export APP_DEBUG=true
APP_URL="http://127.0.0.1:3000"
MESSAGE="line1\\nline2"
EMPTY=
    `);

    expect(parsed).toEqual({
      APP_NAME: 'Pondoknusa',
      APP_DEBUG: 'true',
      APP_URL: 'http://127.0.0.1:3000',
      MESSAGE: 'line1\nline2',
      EMPTY: '',
    });
  });
});

describe('loadEnv', () => {
  it('does not override existing environment variables by default', async () => {
    process.env.EXISTING = 'from-shell';

    await loadEnv(process.cwd(), {
      path: fixturePath,
      override: false,
    });

    expect(process.env.EXISTING).toBe('from-shell');
    expect(process.env.APP_NAME).toBe('FixtureApp');
  });

  it('can override existing variables when requested', async () => {
    process.env.APP_NAME = 'OldName';

    await loadEnv(process.cwd(), {
      path: fixturePath,
      override: true,
    });

    expect(process.env.APP_NAME).toBe('FixtureApp');
  });

  it('returns false when the env file is missing', async () => {
    await expect(
      loadEnv(process.cwd(), { path: '/no/such/.env' }),
    ).resolves.toBe(false);
  });
});

