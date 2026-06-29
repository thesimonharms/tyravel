import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigValidationError } from './config-validation-error.js';
import { loadConfig, loadConfigWithSchemas } from './loader.js';

describe('loadConfig schema validation', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('loads schema exports and validates on boot', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-config-schema-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'config', 'app.js'),
      `import { s } from '@pondoknusa/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
  debug: s.boolean(),
});

export default {
  name: 'Pondoknusa',
  debug: true,
};`,
    );

    const config = await loadConfig(tempDir);
    expect(config.app).toEqual({ name: 'Pondoknusa', debug: true });

    const loaded = await loadConfigWithSchemas(tempDir);
    expect(loaded.schemas.app).toBeDefined();
  });

  it('fails fast when schema validation fails', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-config-schema-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'config', 'app.js'),
      `import { s } from '@pondoknusa/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
});

export default {
  name: '',
};`,
    );

    await expect(loadConfig(tempDir)).rejects.toBeInstanceOf(ConfigValidationError);
  });

  it('skips validation when disabled', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-config-schema-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'config', 'app.js'),
      `import { s } from '@pondoknusa/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
});

export default { name: '' };`,
    );

    const config = await loadConfig(tempDir, { validate: false });
    expect(config.app).toEqual({ name: '' });
  });
});