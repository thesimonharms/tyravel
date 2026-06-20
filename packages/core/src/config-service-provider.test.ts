import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigRepository } from '@tyravel/config';
import { Application } from './application.js';
import { ConfigServiceProvider } from './config-service-provider.js';

describe('ConfigServiceProvider', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('loads typed config files into the container', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-config-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'config', 'app.js'),
      'export default { name: "Tyravel", debug: true };',
    );

    const app = new Application(tempDir);
    app.register(ConfigServiceProvider);
    await app.boot();

    const config = app.make<ConfigRepository>('config');
    expect(config.get<string>('app.name')).toBe('Tyravel');
    expect(config.get<boolean>('app.debug')).toBe(true);
  });

  it('loads .env before importing config modules', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-config-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(join(tempDir, '.env'), 'APP_NAME=FromDotEnv\n');
    writeFileSync(
      join(tempDir, 'config', 'app.js'),
      `import { env } from '@tyravel/config';
export default { name: env('APP_NAME', 'fallback') };`,
    );

    const app = new Application(tempDir);
    app.register(ConfigServiceProvider);
    await app.boot();

    const config = app.make<ConfigRepository>('config');
    expect(config.get<string>('app.name')).toBe('FromDotEnv');
  });
});