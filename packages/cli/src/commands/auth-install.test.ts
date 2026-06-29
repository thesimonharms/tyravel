import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NewCommand } from './new.js';
import { AuthInstallCommand } from './auth-install.js';

describe('AuthInstallCommand', () => {
  let tempDir = '';
  let previousCwd = '';

  afterEach(() => {
    if (previousCwd) {
      process.chdir(previousCwd);
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('installs headless-aware auth scaffolding', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-auth-install-'));
    previousCwd = process.cwd();

    const newCommand = new NewCommand();
    expect(
      await newCommand.handle([
        'headless-auth',
        `--path=${tempDir}`,
        '--headless',
        '--no-auth',
        '--db=sqlite',
        '--no-redis',
      ]),
    ).toBe(0);

    const projectDir = join(tempDir, 'headless-auth');
    process.chdir(projectDir);

    const authCommand = new AuthInstallCommand();
    expect(await authCommand.handle()).toBe(0);

    const main = readFileSync(join(projectDir, 'src/main.ts'), 'utf8');
    const authRoutes = readFileSync(join(projectDir, 'src/routes/auth.ts'), 'utf8');
    const authConfig = readFileSync(join(projectDir, 'config/auth.ts'), 'utf8');

    expect(main).toContain('prepareHttpServer');
    expect(main).not.toContain('ViewServiceProvider');
    expect(main).toContain('./routes/api.js');
    expect(authRoutes).toContain("Route.prefix('api/v1')");
    expect(authRoutes).not.toContain('csrf');
    expect(authConfig).toContain("guard: 'api'");
    expect(existsSync(join(projectDir, 'src/models/User.ts'))).toBe(true);
  });
});