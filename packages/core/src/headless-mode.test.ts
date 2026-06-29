import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigRepository } from '@pondoknusa/config';
import { afterEach, describe, expect, it } from 'vitest';
import { isHeadlessMode, resolveHeadlessMode } from './headless-mode.js';

describe('headless mode', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('reads app.headless from config', () => {
    const config = new ConfigRepository({ app: { headless: true } });
    expect(isHeadlessMode(config)).toBe(true);
  });

  it('resolves pondoknusa.json mode headless', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'api', mode: 'headless', entry: 'src/main.ts' }),
    );

    expect(await resolveHeadlessMode(tempDir)).toBe(true);
  });

  it('prefers config.app.headless over pondoknusa.json', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'api', entry: 'src/main.ts' }),
    );
    const config = new ConfigRepository({ app: { headless: true } });

    expect(await resolveHeadlessMode(tempDir, config)).toBe(true);
  });

  it('returns false when neither signal is set', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'app', entry: 'src/main.ts' }),
    );
    const config = new ConfigRepository({ app: { name: 'app' } });

    expect(await resolveHeadlessMode(tempDir, config)).toBe(false);
  });
});