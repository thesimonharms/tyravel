import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MakeSocialDriverCommand } from './make-social-driver.js';

describe('MakeSocialDriverCommand', () => {
  let tempDir = '';
  let previousCwd = '';

  afterEach(() => {
    if (previousCwd) {
      process.chdir(previousCwd);
      previousCwd = '';
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('scaffolds a social OAuth driver', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-social-driver-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'pondoknusa.json'), JSON.stringify({ name: 'app', entry: 'src/main.ts' }));
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');

    previousCwd = process.cwd();
    process.chdir(tempDir);

    const command = new MakeSocialDriverCommand();
    const exitCode = await command.handle(['acme']);

    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'app/social/drivers/AcmeOAuthDriver.ts'))).toBe(true);
    expect(readFileSync(join(tempDir, 'app/social/drivers/AcmeOAuthDriver.ts'), 'utf8')).toContain(
      "readonly name = 'acme'",
    );
  });
});