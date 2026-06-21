import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { lintViewSource } from './view-lint.js';
import { ViewEngine } from './view-engine.js';

function createFixture(): { basePath: string; engine: ViewEngine } {
  const basePath = join(tmpdir(), `tyravel-61-${Date.now()}-${Math.random()}`);
  mkdirSync(join(basePath, 'resources/views'), { recursive: true });
  const engine = new ViewEngine(basePath, { path: 'resources/views' });
  return { basePath, engine };
}

describe('Tier 6.1 hardening', () => {
  it('throws in local environment when @inject has no injector', async () => {
    const { basePath, engine } = createFixture();
    engine.setEnvironment('local');

    writeFileSync(
      join(basePath, 'resources/views/injected.tyr'),
      `@inject('stats', 'Counter')
<span>{{ stats }}</span>
`,
    );

    await expect(engine.render('injected', {})).rejects.toThrow(/requires a view injector/);
  });

  it('silently skips @inject in production when no injector is registered', async () => {
    const { basePath, engine } = createFixture();
    engine.setEnvironment('production');

    writeFileSync(
      join(basePath, 'resources/views/injected.tyr'),
      `@inject('stats', 'Counter')
<span>ok</span>
`,
    );

    const html = await engine.render('injected', {});
    expect(html).toContain('<span>ok</span>');
  });

  it('lints unknown custom directives', () => {
    const issues = lintViewSource(`@datetime(value)\n`, {
      customDirectives: new Set(['badge']),
    });

    expect(issues.some((issue) => issue.rule === 'unknown-custom-directive')).toBe(true);
    expect(issues.some((issue) => issue.message.includes('@datetime'))).toBe(true);
  });

  it('allows registered custom directives during lint', () => {
    const issues = lintViewSource(`@datetime(value)\n`, {
      customDirectives: new Set(['datetime']),
    });

    expect(issues.some((issue) => issue.rule === 'unknown-custom-directive')).toBe(false);
  });
});