import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CryptoInstallCommand } from './crypto-install.js';

describe('CryptoInstallCommand', () => {
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

  it('scaffolds config/crypto.ts', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-crypto-install-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'tyravel.json'), JSON.stringify({ name: 'app', entry: 'src/main.ts' }));
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');

    previousCwd = process.cwd();
    process.chdir(tempDir);

    const command = new CryptoInstallCommand();
    const exitCode = await command.handle();

    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'config/crypto.ts'))).toBe(true);
  });
});