import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findProjectRoot } from './project.js';

describe('findProjectRoot', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('finds the nearest directory with Tyravel markers', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'tyravel-root-'));
    writeFileSync(join(tempDir, 'tyravel.json'), '{}');
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src/main.ts'), '');

    const nested = join(tempDir, 'app', 'routes');
    mkdirSync(nested, { recursive: true });

    await expect(findProjectRoot(nested)).resolves.toBe(tempDir);
  });
});