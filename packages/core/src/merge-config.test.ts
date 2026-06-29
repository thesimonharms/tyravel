import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigRepository } from '@pondoknusa/config';
import { Application } from './application.js';
import { ConfigServiceProvider } from './config-service-provider.js';
import { ServiceProvider } from './service-provider.js';

describe('ServiceProvider.mergeConfigFrom', () => {
  let root = '';
  let packageConfig = '';

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = '';
    }
    if (packageConfig) {
      rmSync(packageConfig, { recursive: true, force: true });
      packageConfig = '';
    }
  });

  it('merges package defaults with app config overrides', async () => {
    root = mkdtempSync(join(tmpdir(), 'pondoknusa-consumer-'));
    packageConfig = mkdtempSync(join(tmpdir(), 'pondoknusa-lontar-config-'));

    mkdirSync(join(root, 'config'), { recursive: true });
    writeFileSync(
      join(root, 'config', 'lontar.js'),
      `export default {
        perPage: 25,
        feed: { title: 'My Blog' },
      };`,
    );
    writeFileSync(
      join(packageConfig, 'lontar.js'),
      `export default {
        perPage: 15,
        feed: { title: 'Lontar', limit: 20 },
      };`,
    );

    class LontarServiceProvider extends ServiceProvider {
      override async register() {
        await this.mergeConfigFrom(join(packageConfig, 'lontar.js'), 'lontar');
      }
    }

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(LontarServiceProvider);
    await app.boot();

    const config = app.make<ConfigRepository>('config');
    expect(config.get<number>('lontar.perPage')).toBe(25);
    expect(config.get<string>('lontar.feed.title')).toBe('My Blog');
    expect(config.get<number>('lontar.feed.limit')).toBe(20);
  });

  it('uses package defaults when the app has no config file', async () => {
    root = mkdtempSync(join(tmpdir(), 'pondoknusa-consumer-'));
    packageConfig = mkdtempSync(join(tmpdir(), 'pondoknusa-lontar-config-'));
    mkdirSync(join(root, 'config'), { recursive: true });

    writeFileSync(
      join(packageConfig, 'lontar.js'),
      `export default {
        perPage: 15,
        feed: { title: 'Lontar', limit: 20 },
      };`,
    );

    class LontarServiceProvider extends ServiceProvider {
      override async register() {
        await this.mergeConfigFrom(join(packageConfig, 'lontar.js'), 'lontar');
      }
    }

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(LontarServiceProvider);
    await app.boot();

    const config = app.make<ConfigRepository>('config');
    expect(config.get<number>('lontar.perPage')).toBe(15);
    expect(config.get<string>('lontar.feed.title')).toBe('Lontar');
    expect(config.get<number>('lontar.feed.limit')).toBe(20);
  });

  it('supports app.mergeConfig directly', async () => {
    root = mkdtempSync(join(tmpdir(), 'pondoknusa-consumer-'));
    mkdirSync(join(root, 'config'), { recursive: true });
    writeFileSync(
      join(root, 'config', 'lontar.js'),
      'export default { perPage: 30 };',
    );

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    await app.boot();

    app.mergeConfig('lontar', {
      perPage: 15,
      feed: { title: 'Lontar' },
    });

    const config = app.make<ConfigRepository>('config');
    expect(config.get<number>('lontar.perPage')).toBe(30);
    expect(config.get<string>('lontar.feed.title')).toBe('Lontar');
  });
});