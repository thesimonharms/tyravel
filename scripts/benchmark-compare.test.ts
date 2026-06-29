import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('benchmark-compare', () => {
  it('reports regressions above the threshold', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pondoknusa-bench-compare-'));
    const currentPath = join(dir, 'current.json');
    const baselinePath = join(dir, 'baseline.json');

    writeFileSync(
      baselinePath,
      JSON.stringify({
        results: [{ name: 'http.json', label: 'HTTP JSON', unit: 'req/s', value: 10_000 }],
      }),
    );
    writeFileSync(
      currentPath,
      JSON.stringify({
        results: [{ name: 'http.json', label: 'HTTP JSON', unit: 'req/s', value: 8_000 }],
      }),
    );

    const output = execFileSync(
      'node',
      ['scripts/benchmark-compare.mjs', currentPath, baselinePath],
      { encoding: 'utf8' },
    );

    expect(output).toContain('Benchmark regressions');
    expect(output).toContain('http.json');
  });
});