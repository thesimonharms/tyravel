import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NewCommand } from './new.js';

describe('NewCommand', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('scaffolds a Tyravel application', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-new-'));
    const command = new NewCommand();

    const code = await command.handle([
      'my-app',
      `--path=${tempDir}`,
      '--db=sqlite',
      '--no-redis',
    ]);
    const projectDir = join(tempDir, 'my-app');

    expect(code).toBe(0);
    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
    expect(existsSync(join(projectDir, '.env'))).toBe(true);
    expect(existsSync(join(projectDir, '.env.example'))).toBe(true);
    expect(existsSync(join(projectDir, 'tyravel.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'config/app.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/main.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/routes/web.ts'))).toBe(true);
    expect(
      existsSync(join(projectDir, 'src/providers/app-service-provider.ts')),
    ).toBe(true);
    expect(existsSync(join(projectDir, 'config/redis.ts'))).toBe(false);
  });

  it('scaffolds mysql and redis driver packages when requested', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-new-'));
    const command = new NewCommand();

    const code = await command.handle([
      'driver-app',
      `--path=${tempDir}`,
      '--db=mysql',
      '--redis',
    ]);
    const projectDir = join(tempDir, 'driver-app');
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };

    expect(code).toBe(0);
    expect(pkg.dependencies['@tyravel/database-mysql']).toBeDefined();
    expect(pkg.dependencies['@tyravel/redis-node']).toBeDefined();
    expect(existsSync(join(projectDir, 'config/redis.ts'))).toBe(true);
    expect(readFileSync(join(projectDir, 'src/main.ts'), 'utf8')).toContain(
      'MysqlDatabaseServiceProvider',
    );
    expect(readFileSync(join(projectDir, 'src/main.ts'), 'utf8')).toContain(
      'NodeRedisServiceProvider',
    );
  });
});