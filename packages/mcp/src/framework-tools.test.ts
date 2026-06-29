import { describe, expect, it } from 'vitest';
import { buildAppManifest, createFrameworkTools } from './framework-tools.js';
import { flattenConfigKeys } from './config-keys.js';
import { buildCapabilityManifest } from './manifest.js';

describe('framework MCP tools', () => {
  it('flattens config keys and redacts sensitive lookups', async () => {
    const keys = flattenConfigKeys({
      app: { name: 'demo', debug: true },
      database: { connections: { postgres: { password: 'secret' } } },
    });

    expect(keys).toContain('app.name');
    expect(keys).toContain('database.connections.postgres.password');

    const context = {
      manifest: buildCapabilityManifest(),
      routes: [],
      models: [],
      configKeys: keys,
      commands: ['pondoknusa serve'],
      docs: [{ path: 'guide/intro.md', title: 'Introduction' }],
      getConfig(key: string) {
        if (key === 'app.name') {
          return 'demo';
        }
        if (key === 'database.connections.postgres.password') {
          return 'secret';
        }
        return undefined;
      },
    };

    const tools = createFrameworkTools(context);
    const configTool = tools.find((tool) => tool.name === 'pondoknusa.config');
    const docsTool = tools.find((tool) => tool.name === 'pondoknusa.docs');

    expect(await configTool?.handler({})).toEqual(keys);
    expect(await configTool?.handler({ key: 'app.name' })).toBe('demo');
    await expect(configTool?.handler({ key: 'database.connections.postgres.password' }))
      .rejects.toThrow(/redacted/i);
    expect(await docsTool?.handler({ path: 'intro' })).toEqual([
      { path: 'guide/intro.md', title: 'Introduction' },
    ]);

    const manifest = buildAppManifest(context);
    expect(manifest.routes).toEqual([]);
    expect(manifest.docs).toHaveLength(1);
  });
});