import type { CapabilityManifest } from './types.js';

export type { CapabilityManifest, AppMcpContext, DocEntry, ModelEntry, RouteEntry } from './types.js';

const STABLE_PACKAGES = [
  '@pondoknusa/core',
  '@pondoknusa/database',
  '@pondoknusa/http',
  '@pondoknusa/queue',
  '@pondoknusa/events',
  '@pondoknusa/broadcasting',
  '@pondoknusa/broadcasting-websocket',
  '@pondoknusa/vector',
  '@pondoknusa/vector-pg',
  '@pondoknusa/vector-qdrant',
  '@pondoknusa/vector-pinecone',
  '@pondoknusa/rag',
  '@pondoknusa/graphql',
  '@pondoknusa/mcp',
  '@pondoknusa/echo',
  '@pondoknusa/auth',
  '@pondoknusa/views',
  '@pondoknusa/cli',
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
  'pondoknusa new',
  'pondoknusa serve',
  'pondoknusa migrate',
  'pondoknusa queue:work',
  'pondoknusa vector:embed',
  'pondoknusa vector:install',
  'pondoknusa make:tool',
  'pondoknusa make:rag-resource',
  'pondoknusa mcp:serve',
  'pondoknusa mcp:export-rules',
  'pondoknusa route:list',
] as const;

export function buildCapabilityManifest(
  overrides: Partial<CapabilityManifest> = {},
): CapabilityManifest {
  return {
    name: overrides.name ?? 'pondoknusa',
    version: overrides.version ?? '2.0.0',
    packages: overrides.packages ?? [...STABLE_PACKAGES],
    facades: overrides.facades ?? [...FACADES],
    commands: overrides.commands ?? [...CLI_COMMANDS],
    routes: overrides.routes,
    models: overrides.models,
    configKeys: overrides.configKeys,
    docs: overrides.docs,
  };
}