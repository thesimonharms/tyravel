import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isHeadlessProject } from './headless-project.js';

describe('isHeadlessProject', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('detects pondoknusa.json mode headless', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'api', mode: 'headless', entry: 'src/main.ts', serve: { port: 3000, hostname: '127.0.0.1' } }),
    );
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');
    writeFileSync(join(tempDir, 'config/app.ts'), 'export default { name: "api" };\n');

    expect(await isHeadlessProject(tempDir)).toBe(true);
  });

  it('detects config.app.headless', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'api', entry: 'src/main.ts', serve: { port: 3000, hostname: '127.0.0.1' } }),
    );
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');
    writeFileSync(
      join(tempDir, 'config/app.ts'),
      `import { env, s } from '@pondoknusa/config';
export const schema = s.object({ name: s.string(), headless: s.boolean() });
export default { name: env('APP_NAME', 'api'), headless: true };
`,
    );

    expect(await isHeadlessProject(tempDir)).toBe(true);
  });

  it('returns false for full-stack projects', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-headless-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(
      join(tempDir, 'pondoknusa.json'),
      JSON.stringify({ name: 'app', entry: 'src/main.ts', serve: { port: 3000, hostname: '127.0.0.1' } }),
    );
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');
    writeFileSync(
      join(tempDir, 'config/app.ts'),
      `import { env, s } from '@pondoknusa/config';
export const schema = s.object({ name: s.string() });
export default { name: env('APP_NAME', 'app') };
`,
    );

    expect(await isHeadlessProject(tempDir)).toBe(false);
  });
});