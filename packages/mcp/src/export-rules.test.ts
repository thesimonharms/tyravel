import { describe, expect, it } from 'vitest';
import { buildCapabilityManifest } from './manifest.js';
import { defaultRulesOutputPath, renderAgentRules } from './export-rules.js';

describe('renderAgentRules', () => {
  it('renders cursor and agents formats from the manifest', () => {
    const context = {
      manifest: buildCapabilityManifest({ name: 'demo-app' }),
      routes: [{ method: 'GET', uri: '/rag/ask', middleware: [], action: 'Closure' }],
      models: [{ name: 'Document', file: 'src/models/Document.ts', table: 'documents' }],
      configKeys: ['app.name'],
      commands: ['pondoknusa serve', 'pondoknusa mcp:serve'],
      docs: [{ path: 'guide/intro.md', title: 'Introduction' }],
    };

    const cursor = renderAgentRules(context, { format: 'cursor' });
    const agents = renderAgentRules(context, { format: 'agents' });

    expect(cursor).toContain('---');
    expect(cursor).toContain('alwaysApply: true');
    expect(cursor).toContain('GET /rag/ask');
    expect(agents).toContain('AGENTS.md');
    expect(agents).toContain('demo-app');
    expect(defaultRulesOutputPath('cursor')).toBe('.cursor/rules/pondoknusa.mdc');
  });
});