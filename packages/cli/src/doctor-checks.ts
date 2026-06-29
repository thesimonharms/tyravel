import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, loadEnv } from '@pondoknusa/config';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  setRouteApplication,
} from '@pondoknusa/core';
import { docsLink } from '@pondoknusa/support';
import { isHeadlessProject } from './headless-project.js';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

export async function runDoctorChecks(root: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const headless = await isHeadlessProject(root);

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({
    name: 'node',
    ok: nodeMajor >= 26,
    message: nodeMajor >= 26
      ? `Node.js ${process.versions.node}`
      : `Node.js ${process.versions.node} is below 26 — see ${docsLink('/guide/deployment')}`,
  });

  const storageDirectories = headless
    ? ['storage', 'storage/framework', 'storage/logs']
    : ['storage', 'storage/framework', 'storage/framework/views', 'storage/logs'];

  for (const directory of storageDirectories) {
    const target = join(root, directory);
    try {
      await access(target, constants.W_OK);
      checks.push({ name: directory, ok: true, message: 'Writable' });
    } catch {
      checks.push({
        name: directory,
        ok: false,
        message: `Missing or not writable — create ${directory}/`,
      });
    }
  }

  await loadEnv(root);
  let config: Record<string, unknown> = {};
  try {
    config = (await loadConfig(root, { validate: false })) as Record<string, unknown>;
  } catch (error) {
    checks.push({
      name: 'config',
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const appConfig = config.app as { env?: string } | undefined;
  const environment = appConfig?.env ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? 'production';
  const viewsConfig = config.views as { compiled?: boolean; compiledPath?: string } | undefined;
  const cacheDirectory = join(root, viewsConfig?.compiledPath ?? 'storage/framework/views');

  if (headless) {
    checks.push({
      name: 'mode',
      ok: true,
      message: `Headless API — see ${docsLink('/guide/headless')}`,
    });
  }

  if (!headless && environment === 'production' && viewsConfig?.compiled !== false) {
    try {
      await access(cacheDirectory, constants.R_OK);
      checks.push({ name: 'view-cache', ok: true, message: `Compiled views present at ${cacheDirectory}` });
    } catch {
      checks.push({
        name: 'view-cache',
        ok: false,
        message: `Production requires compiled views — run \`pondoknusa view:cache\`. See ${docsLink('/guide/deployment')}`,
      });
    }
  }

  const databaseConfig = config.database as {
    default?: string;
    connections?: Record<string, { driver?: string }>;
  } | undefined;
  const defaultConnection = databaseConfig?.default;
  if (defaultConnection && defaultConnection !== 'array') {
    try {
      const app = new Application(root);
      setRouteApplication(app);
      app.register(ConfigServiceProvider);
      app.register(DatabaseServiceProvider);
      await app.boot();
      await app.make<import('@pondoknusa/database').DatabaseManager>('db').connection().query('SELECT 1');
      checks.push({ name: 'database', ok: true, message: `${defaultConnection} connection OK` });
    } catch (error) {
      checks.push({
        name: 'database',
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const redisConfig = config.redis as { default?: string } | undefined;
  if (redisConfig?.default) {
    try {
      const { registerNodeRedisDriver } = await import('@pondoknusa/redis-node');
      const { RedisServiceProvider } = await import('@pondoknusa/core');
      registerNodeRedisDriver();
      const app = new Application(root);
      app.register(ConfigServiceProvider);
      app.register(RedisServiceProvider);
      await app.boot();
      const redis = app.make<import('@pondoknusa/redis').RedisManager>('redis');
      const client = await redis.connection();
      await client.set('pondoknusa:doctor:probe', '1', { EX: 5 });
      checks.push({ name: 'redis', ok: true, message: 'Redis connection OK' });
    } catch (error) {
      checks.push({
        name: 'redis',
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const authConfig = config.auth as {
    oauth?: { providers?: Record<string, { redirectUri?: string }> };
  } | undefined;

  for (const [provider, providerConfig] of Object.entries(authConfig?.oauth?.providers ?? {})) {
    const redirectUri = providerConfig.redirectUri;
    if (!redirectUri) {
      continue;
    }

    let valid = false;
    try {
      const url = new URL(redirectUri);
      valid = url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      valid = false;
    }

    checks.push({
      name: `oauth:${provider}`,
      ok: valid,
      message: valid
        ? `Redirect URI ${redirectUri}`
        : `Invalid OAuth redirect URI for ${provider}`,
    });
  }

  return checks;
}