import type { ConfigTree } from './repository.js';
import { ConfigValidationError, type ConfigValidationFailure } from './config-validation-error.js';

function fail(config: string, path: string, message: string): ConfigValidationFailure {
  return { config, path, message };
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectOAuthFailures(auth: Record<string, unknown> | undefined): ConfigValidationFailure[] {
  const failures: ConfigValidationFailure[] = [];
  const oauth = auth?.oauth as { providers?: Record<string, Record<string, unknown>> } | undefined;

  for (const [provider, providerConfig] of Object.entries(oauth?.providers ?? {})) {
    const clientId = providerConfig.clientId;
    const clientSecret = providerConfig.clientSecret;
    const redirectUri = providerConfig.redirectUri;

    if (!isNonEmpty(clientId)) {
      continue;
    }

    if (!isNonEmpty(clientSecret)) {
      failures.push(
        fail(
          'auth',
          `oauth.providers.${provider}.clientSecret`,
          `${provider.toUpperCase()}_CLIENT_SECRET is required when ${provider.toUpperCase()}_CLIENT_ID is set`,
        ),
      );
    }

    if (!isNonEmpty(redirectUri)) {
      failures.push(
        fail(
          'auth',
          `oauth.providers.${provider}.redirectUri`,
          `${provider.toUpperCase()}_REDIRECT_URI is required when ${provider.toUpperCase()}_CLIENT_ID is set`,
        ),
      );
    }
  }

  return failures;
}

function collectConnectionFailures(config: ConfigTree): ConfigValidationFailure[] {
  const failures: ConfigValidationFailure[] = [];

  const database = config.database as {
    default?: string;
    connections?: Record<string, Record<string, unknown>>;
  } | undefined;

  const dbDefault = database?.default;
  if (dbDefault && dbDefault !== 'array') {
    const connection = database?.connections?.[dbDefault];
    if (!connection) {
      failures.push(
        fail('database', 'default', `DB_CONNECTION "${dbDefault}" has no matching connections.${dbDefault} entry`),
      );
    } else {
      const driver = connection.driver;
      if (driver === 'mysql' || driver === 'postgres') {
        if (!isNonEmpty(connection.database)) {
          failures.push(fail('database', `connections.${dbDefault}.database`, 'DB_DATABASE is required'));
        }
        if (!isNonEmpty(connection.host)) {
          failures.push(fail('database', `connections.${dbDefault}.host`, 'DB_HOST is required'));
        }
      } else if (driver === 'sqlite' && !isNonEmpty(connection.database)) {
        failures.push(fail('database', `connections.${dbDefault}.database`, 'DB_DATABASE is required'));
      }
    }
  }

  const queue = config.queue as {
    default?: string;
    connections?: Record<string, Record<string, unknown>>;
  } | undefined;

  const queueDefault = queue?.default;
  if (queueDefault && queueDefault !== 'sync') {
    const connection = queue?.connections?.[queueDefault];
    if (!connection) {
      failures.push(
        fail('queue', 'default', `QUEUE_CONNECTION "${queueDefault}" has no matching connections.${queueDefault} entry`),
      );
    }
  }

  const redis = config.redis as {
    default?: string;
    connections?: Record<string, Record<string, unknown>>;
  } | undefined;

  const redisDefault = redis?.default;
  if (redisDefault) {
    const connection = redis?.connections?.[redisDefault];
    if (!connection) {
      failures.push(
        fail('redis', 'default', `Redis default "${redisDefault}" has no matching connections.${redisDefault} entry`),
      );
    }
  }

  const cache = config.cache as { default?: string } | undefined;
  if (cache?.default === 'redis' && !redisDefault) {
    failures.push(
      fail('cache', 'default', 'CACHE_STORE=redis requires redis.default to be configured — see docs'),
    );
  }

  return failures;
}

export function collectBootEnvFailures(config: ConfigTree): ConfigValidationFailure[] {
  return [...collectConnectionFailures(config), ...collectOAuthFailures(config.auth as Record<string, unknown>)];
}

export function validateBootEnv(config: ConfigTree): void {
  const failures = collectBootEnvFailures(config);
  if (failures.length === 0) {
    return;
  }

  const error = new ConfigValidationError(failures);
  error.message = `${error.message}\nSee https://pondoknusa.dev/guide/configuration-reference for environment variable reference.`;
  throw error;
}