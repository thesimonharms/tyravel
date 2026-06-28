import type { CapabilityManifest } from './types.js';

export type { CapabilityManifest, AppMcpContext, DocEntry, ModelEntry, RouteEntry } from './types.js';

const STABLE_PACKAGES = [
  '@tyravel/core',
  '@tyravel/database',
  '@tyravel/http',
  '@tyravel/queue',
  '@tyravel/events',
  '@tyravel/broadcasting',
  '@tyravel/broadcasting-websocket',
  '@tyravel/vector',
  '@tyravel/vector-pg',
  '@tyravel/vector-qdrant',
  '@tyravel/vector-pinecone',
  '@tyravel/rag',
  '@tyravel/graphql',
  '@tyravel/mcp',
  '@tyravel/echo',
  '@tyravel/auth',
  '@tyravel/views',
  '@tyravel/cli',
] as const;

const FACADES = [
  'Route',
  'Auth',
  'Cache',
  'Queue',
  'Events',
  'Mail',
  'View',
  'Broadcast',
] as const;

const CLI_COMMANDS = [
  'tyravel new',
  'tyravel serve',
  'tyravel migrate',
  'tyravel queue:work',
  'tyravel vector:embed',
  'tyravel vector:install',
  'tyravel make:tool',
  'tyravel make:rag-resource',
  'tyravel mcp:serve',
  'tyravel mcp:export-rules',
  'tyravel route:list',
] as const;

export function buildCapabilityManifest(
  overrides: Partial<CapabilityManifest> = {},
): CapabilityManifest {
  return {
    name: overrides.name ?? 'tyravel',
    version: overrides.version ?? '1.0.3',
    packages: overrides.packages ?? [...STABLE_PACKAGES],
    facades: overrides.facades ?? [...FACADES],
    commands: overrides.commands ?? [...CLI_COMMANDS],
    routes: overrides.routes,
    models: overrides.models,
    configKeys: overrides.configKeys,
    docs: overrides.docs,
  };
}