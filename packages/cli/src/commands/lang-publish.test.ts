import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { LangPublishCommand } from './lang-publish.js';
import { writeFile } from '../utils.js';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
});

describe('LangPublishCommand', () => {
  it('creates lang/en.json in a project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pondoknusa-lang-'));
    tempDirs.push(root);
    process.chdir(root);

    await writeFile(join(root, 'pondoknusa.json'), JSON.stringify({
      name: 'demo',
      entry: 'src/main.ts',
      serve: { port: 3000, hostname: '127.0.0.1' },
    }));
    await writeFile(join(root, 'src/main.ts'), 'export {};\n');

    const command = new LangPublishCommand();
    const code = await command.handle([]);

    expect(code).toBe(0);
    const locale = await readFile(join(root, 'lang/en.json'), 'utf8');
    expect(locale).toContain('Welcome to Pondoknusa');
  });
});