import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '@tyravel/config';
import { OAuthServer, OAuthServerServiceProvider } from '@tyravel/auth-oauth';
import {
  Application,
  AuthServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  ServiceProvider,
} from '@tyravel/core';
import type { DatabaseConfig } from '@tyravel/database';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { optionFlag, optionString, parseOptions, positionalArgs } from '../utils.js';

export class OAuthClientCreateCommand extends Command {
  override readonly name = 'oauth:client:create';
  override readonly description = 'Register a new OAuth2 client';
  override readonly usage =
    'tyravel oauth:client:create <name> [--redirect=uri] [--public] [--grants=authorization_code,refresh_token]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [name] = positionalArgs(args);

    if (!name) {
      console.error('Client name is required.');
      return 1;
    }

    const redirect = optionString(options, 'redirect');
    if (!redirect) {
      console.error('--redirect is required.');
      return 1;
    }

    const root = await requireProjectRoot();
    const config = await loadConfig(root);
    const database = config.database as DatabaseConfig | undefined;
    if (!database) {
      console.error('Database config not found.');
      return 1;
    }

    const app = new Application(root);
    app.register(ConfigServiceProvider);
    app.register(DatabaseServiceProvider);
    app.register(AuthServiceProvider);
    app.register(OAuthServerServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const server = app.make(OAuthServer);
    const grants = (optionString(options, 'grants') ?? 'authorization_code,refresh_token')
      .split(',')
      .map((grant) => grant.trim())
      .filter(Boolean) as ('authorization_code' | 'client_credentials' | 'refresh_token')[];

    const client = await server.createClient({
      name,
      redirectUris: [redirect],
      grants,
      confidential: !optionFlag(options, 'public'),
    });

    console.log('OAuth client created.');
    console.log(`  name: ${client.name}`);
    console.log(`  client_id: ${client.clientId}`);
    if (client.clientSecret) {
      console.log(`  client_secret: ${client.clientSecret}`);
    } else {
      console.log('  client_secret: (public client)');
    }

    return 0;
  }
}

async function importAppServiceProvider(
  root: string,
): Promise<{ AppServiceProvider?: unknown } | undefined> {
  const providerPath = join(root, 'src/providers/app-service-provider.ts');
  try {
    return (await import(pathToFileURL(providerPath).href)) as {
      AppServiceProvider?: unknown;
    };
  } catch {
    return undefined;
  }
}