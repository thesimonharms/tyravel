import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '@pondoknusa/config';
import { ConfigRepository } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  ServiceProvider,
} from '@pondoknusa/core';
import {
  buildCapabilityManifest,
  defaultRulesOutputPath,
  discoverDocs,
  discoverModels,
  flattenConfigKeys,
  renderAgentRules,
  type AgentRulesFormat,
  type AppMcpContext,
} from '@pondoknusa/mcp';
import { createKernel } from '../kernel.js';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider } from '../project-bootstrap.js';
import { optionString, parseOptions, positionalArgs } from '../utils.js';
import { importRoutes } from './mcp-serve-shared.js';

export class McpExportRulesCommand extends Command {
  override readonly name = 'mcp:export-rules';
  override readonly description = 'Export Cursor/Claude agent rules from the Pondoknusa capability manifest';
  override readonly usage =
    'pondoknusa mcp:export-rules [--format=cursor|claude|agents] [--output=<path>]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    let format: AgentRulesFormat;
    try {
      format = parseFormat(optionString(options, 'format', 'cursor') ?? 'cursor');
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }

    const root = await requireProjectRoot();
    await loadConfig(root);

    const app = new Application(root);
    setRouteApplication(app);
    app.register(ConfigServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const routesModule = await importRoutes(root);
    routesModule?.registerRoutes?.();

    const config = app.make<ConfigRepository>('config');
    const context: AppMcpContext = {
      manifest: buildCapabilityManifest({ name: config.get<string>('app.name') }),
      routes: app.router().listRoutes(),
      models: await discoverModels(root),
      configKeys: flattenConfigKeys(config.all()),
      commands: createKernel().list().map((command) => `pondoknusa ${command.name}`),
      docs: await discoverDocs(root),
    };

    const output = optionString(options, 'output')
      ?? defaultRulesOutputPath(format);
    const target = resolve(root, output);
    const contents = renderAgentRules(context, {
      format,
      projectName: config.get<string>('app.name'),
    });

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');

    console.log(`Agent rules exported: ${output}`);
    return 0;
  }
}

function parseFormat(value: string): AgentRulesFormat {
  if (value === 'cursor' || value === 'claude' || value === 'agents') {
    return value;
  }

  throw new Error(`Unsupported format [${value}]. Use cursor, claude, or agents.`);
}