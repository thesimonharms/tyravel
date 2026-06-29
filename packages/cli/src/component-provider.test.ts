import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { registerComponentInProvider } from './component-provider.js';

describe('registerComponentInProvider', () => {
  it('registers a class-based component in AppServiceProvider', async () => {
    const root = join(tmpdir(), `pondoknusa-component-provider-${Date.now()}`);
    mkdirSync(join(root, 'src/providers'), { recursive: true });

    const providerPath = join(root, 'src/providers/app-service-provider.ts');
    const initial = `import { ServiceProvider } from '@pondoknusa/core';

export class AppServiceProvider extends ServiceProvider {
  override register() {}
}
`;
    writeFileSync(providerPath, initial);

    const registered = await registerComponentInProvider(root, 'AlertComponent', 'alert');
    expect(registered).toBe(true);

    const updated = readFileSync(providerPath, 'utf8');
    expect(updated).toContain("import { AlertComponent } from '../components/AlertComponent.js';");
    expect(updated).toContain("View.component('alert', this.app.make(AlertComponent));");
    expect(updated).toContain('import { ServiceProvider, View }');
  });
});