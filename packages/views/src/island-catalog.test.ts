import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildViewCatalog } from './island-catalog.js';

describe('buildViewCatalog', () => {
  it('indexes islands from views, client mounts, and programmatic modules', async () => {
    const basePath = join(tmpdir(), `pondoknusa-island-catalog-${Date.now()}`);
    mkdirSync(join(basePath, 'resources/views/islands'), { recursive: true });
    mkdirSync(join(basePath, 'resources/client/islands'), { recursive: true });

    writeFileSync(
      join(basePath, 'resources/views/welcome.tyr'),
      `@island('counter', { count: 0 })
  <button>0</button>
@endisland
`,
    );
    writeFileSync(
      join(basePath, 'resources/client/islands/counter.ts'),
      "import { registerIsland } from '@pondoknusa/ssr';\nregisterIsland('counter', () => {});\n",
    );
    writeFileSync(
      join(basePath, 'resources/views/islands/timer.tyr.ts'),
      'export function render() { return "<span>1</span>"; }\nexport function mount() {}\n',
    );

    const catalog = await buildViewCatalog(basePath, { path: 'resources/views' });
    const counter = catalog.islands.find((entry) => entry.id === 'counter');
    const timer = catalog.islands.find((entry) => entry.id === 'timer');

    expect(counter).toMatchObject({
      id: 'counter',
      views: ['welcome'],
      hasClientMount: true,
    });
    expect(counter?.clientPath).toContain('resources/client/islands/counter.ts');
    expect(timer).toMatchObject({
      id: 'timer',
      hasProgrammaticMount: true,
    });
    expect(timer?.programmaticPath).toContain('resources/views/islands/timer.tyr.ts');
  });
});