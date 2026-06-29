import { flattenConfigKeys, isSensitiveConfigKey, redactConfigValue } from './config-keys.js';
import type { AppMcpContext, CapabilityManifest } from './types.js';
import type { McpTool } from './server.js';

export function buildAppManifest(context: AppMcpContext): CapabilityManifest {
  return {
    ...context.manifest,
    routes: context.routes,
    models: context.models,
    configKeys: context.configKeys,
    docs: context.docs,
    commands: context.commands,
  };
}

export function createFrameworkTools(context: AppMcpContext): McpTool[] {
  const manifest = buildAppManifest(context);

  return [
    {
      name: 'pondoknusa.routes',
      description: 'List registered HTTP routes for the Pondoknusa application.',
      inputSchema: { type: 'object', properties: {} },
      async handler() {
        return context.routes;
      },
    },
    {
      name: 'pondoknusa.models',
      description: 'List Eloquent-style models discovered under src/models.',
      inputSchema: { type: 'object', properties: {} },
      async handler() {
        return context.models;
      },
    },
    {
      name: 'pondoknusa.config',
      description: 'List config keys or fetch a single non-sensitive config value.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Optional dotted config key.' },
        },
      },
      async handler(args) {
        const key = typeof args.key === 'string' ? args.key : undefined;
        if (!key) {
          return context.configKeys;
        }

        if (!context.getConfig) {
          throw new Error('Config lookup is not available in this MCP context.');
        }
        if (isSensitiveConfigKey(key)) {
          throw new Error(`Config key [${key}] is redacted for agent safety.`);
        }

        return redactConfigValue(key, context.getConfig(key));
      },
    },
    {
      name: 'pondoknusa.commands',
      description: 'List Pondoknusa CLI commands available to this project.',
      inputSchema: { type: 'object', properties: {} },
      async handler() {
        return context.commands;
      },
    },
    {
      name: 'pondoknusa.docs',
      description: 'Index markdown docs under docs/ with titles for agent retrieval.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Optional relative docs path filter.' },
        },
      },
      async handler(args) {
        const filter = typeof args.path === 'string' ? args.path : undefined;
        if (!filter) {
          return context.docs;
        }
        return context.docs.filter((entry) => entry.path.includes(filter));
      },
    },
    {
      name: 'pondoknusa.capabilities',
      description: 'Return the full Pondoknusa capability manifest for agents.',
      inputSchema: { type: 'object', properties: {} },
      async handler() {
        return manifest;
      },
    },
  ];
}

export { flattenConfigKeys };