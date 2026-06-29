import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

describe('@pondoknusa/repl', () => {
  it('exports startRepl as the stable shell entrypoint', async () => {
    const mod = await import('./index.js');
    expect(typeof mod.startRepl).toBe('function');
  });

  it('resolves the monorepo package path', () => {
    expect(join('src', 'models')).toBe('src/models');
  });
});