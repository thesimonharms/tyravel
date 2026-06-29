import type { AppMcpContext } from './types.js';
import { buildAppManifest } from './framework-tools.js';

export type AgentRulesFormat = 'cursor' | 'claude' | 'agents';

export interface ExportRulesOptions {
  format?: AgentRulesFormat;
  projectName?: string;
}

export function renderAgentRules(
  context: AppMcpContext,
  options: ExportRulesOptions = {},
): string {
  const format = options.format ?? 'cursor';
  const body = renderRulesBody(context, options.projectName);

  if (format === 'cursor') {
    return renderCursorRules(body, options.projectName ?? context.manifest.name);
  }

  if (format === 'claude') {
    return renderClaudeRules(body, options.projectName ?? context.manifest.name);
  }

  return renderAgentsMd(body, options.projectName ?? context.manifest.name);
}

function renderRulesBody(context: AppMcpContext, projectName?: string): string {
  const manifest = buildAppManifest(context);
  const name = projectName ?? manifest.name;

  const routes = (manifest.routes ?? [])
    .slice(0, 25)
    .map((route) => `- ${route.method} ${route.uri}${route.name ? ` (${route.name})` : ''}`)
    .join('\n');

  const models = (manifest.models ?? [])
    .map((model) => `- ${model.name}${model.table ? ` → ${model.table}` : ''} (${model.file})`)
    .join('\n');

  const commands = (manifest.commands ?? [])
    .map((command) => `- ${command}`)
    .join('\n');

  const docs = (manifest.docs ?? [])
    .slice(0, 20)
    .map((doc) => `- ${doc.path} — ${doc.title}`)
    .join('\n');

  const packages = manifest.packages.map((pkg) => `- ${pkg}`).join('\n');
  const facades = manifest.facades.map((facade) => `- ${facade}`).join('\n');

  return `# ${name} — Pondoknusa agent rules

This file is generated from the Pondoknusa capability manifest. Prefer framework primitives over reinventing infrastructure.

## Project stack

- Runtime: Node.js 26+
- Framework: Pondoknusa (TypeScript-native, Laravel-shaped ergonomics)
- LLM integration: use native SDKs in the app layer — Pondoknusa does not ship a unified LLM provider interface

## Installed Pondoknusa packages

${packages || '- (none discovered)'}

## Facades

${facades || '- (none)'}

## CLI commands

${commands || '- pondoknusa list'}

## Models

${models || '- (none under src/models)'}

## Routes

${routes || '- (none registered)'}

## Docs index

${docs || '- (no docs/ markdown found)'}

## Vector / RAG guidance

- Chunk + ingest with \`@pondoknusa/rag\`; embed with app-level SDKs wrapped by \`createCachedEmbedFn()\`
- Local dev: \`registerLocalVectorSearchDriver()\`; Postgres: \`registerPgVectorSearchDriver()\`
- External stores: \`@pondoknusa/vector-qdrant\`, \`@pondoknusa/vector-pinecone\`
- Queue embeddings via \`pondoknusa vector:embed --model=<Name>\` and \`pondoknusa queue:work\`
- Agent tooling: \`pondoknusa mcp:serve\`

## Safety

- Do not print secrets from config. Sensitive keys are redacted by the MCP config tool.
- Keep embedding/LLM API keys in \`.env\`, never commit them.
`;
}

function renderCursorRules(body: string, projectName: string): string {
  return `---
description: Pondoknusa project context for ${projectName}
alwaysApply: true
---

${body}`;
}

function renderClaudeRules(body: string, projectName: string): string {
  return `# CLAUDE.md — ${projectName}

${body}`;
}

function renderAgentsMd(body: string, projectName: string): string {
  return `# AGENTS.md — ${projectName}

${body}`;
}

export function defaultRulesOutputPath(format: AgentRulesFormat): string {
  switch (format) {
    case 'cursor':
      return '.cursor/rules/pondoknusa.mdc';
    case 'claude':
      return 'CLAUDE.md';
    default:
      return 'AGENTS.md';
  }
}