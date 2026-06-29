import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { MakeControllerCommand } from './make-controller.js';

describe('MakeControllerCommand', () => {
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

  function scaffoldProject(): void {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-make-controller-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'pondoknusa.json'), JSON.stringify({ name: 'app', entry: 'src/main.ts' }));
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');
    previousCwd = process.cwd();
    process.chdir(tempDir);
  }

  it('scaffolds an API resource controller with model binding', async () => {
    scaffoldProject();
    const command = new MakeControllerCommand();

    const code = await command.handle(['Post', '--api']);
    const filePath = join(tempDir, 'src/controllers/PostController.ts');

    expect(code).toBe(0);
    expect(existsSync(filePath)).toBe(true);

    const contents = readFileSync(filePath, 'utf8');
    expect(contents).toContain("request.routeModel<Post>('post')");
    expect(contents).toContain('async destroy(request: PondoknusaRequest)');
  });

  it('scaffolds an invokable controller', async () => {
    scaffoldProject();
    const command = new MakeControllerCommand();

    const code = await command.handle(['Search', '--invokable']);
    const filePath = join(tempDir, 'src/controllers/SearchController.ts');

    expect(code).toBe(0);
    expect(readFileSync(filePath, 'utf8')).toContain('async __invoke');
  });
});