import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { registerIslandInClientBundle } from './island-client-registry.js';

describe('registerIslandInClientBundle', () => {
  it('prepends an island import to resources/client/app.ts', async () => {
    const root = join(tmpdir(), `tyravel-island-registry-${Date.now()}`);
    mkdirSync(join(root, 'resources/client'), { recursive: true });
    writeFileSync(
      join(root, 'resources/client/app.ts'),
      "import { hydrate } from '@tyravel/ssr';\n\nhydrate();\n",
    );

    const registered = await registerIslandInClientBundle(root, 'counter');
    expect(registered).toBe(true);

    const source = readFileSync(join(root, 'resources/client/app.ts'), 'utf8');
    expect(source).toContain("import './islands/counter.js';");
    expect(source.indexOf("import './islands/counter.js';")).toBeLessThan(
      source.indexOf("import { hydrate }"),
    );
  });
});