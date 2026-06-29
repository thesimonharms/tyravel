import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MakeIslandCommand } from './make-island.js';

describe('MakeIslandCommand', () => {
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

  it('scaffolds island view and client mount files', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-make-island-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'resources/client'), { recursive: true });
    writeFileSync(join(tempDir, 'pondoknusa.json'), JSON.stringify({ name: 'app', entry: 'src/main.ts' }));
    writeFileSync(join(tempDir, 'src/main.ts'), 'export {};\n');
    writeFileSync(
      join(tempDir, 'resources/client/app.ts'),
      "import { hydrate } from '@pondoknusa/ssr';\n\nhydrate();\n",
    );

    previousCwd = process.cwd();
    process.chdir(tempDir);

    const command = new MakeIslandCommand();
    const code = await command.handle(['counter']);

    expect(code).toBe(0);
    expect(existsSync(join(tempDir, 'resources/views/islands/counter.tyr'))).toBe(true);
    expect(existsSync(join(tempDir, 'resources/client/islands/counter.ts'))).toBe(true);
    expect(readFileSync(join(tempDir, 'resources/client/app.ts'), 'utf8')).toContain(
      "import './islands/counter.js';",
    );
    expect(readFileSync(join(tempDir, 'resources/client/islands/counter.ts'), 'utf8')).toContain(
      "registerIsland('counter'",
    );
  });
});