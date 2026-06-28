import type { DatabaseConfig } from './types.js';

export function resolvePoolWarmupEnabled(
  config?: Pick<DatabaseConfig, 'poolWarmup'>,
): boolean {
  const env = process.env.DB_POOL_WARMUP;
  if (env === 'false' || env === '0') {
    return false;
  }
  if (env === 'true' || env === '1') {
    return true;
  }

  if (config?.poolWarmup !== undefined) {
    return config.poolWarmup;
  }

  return (process.env.NODE_ENV ?? 'development') === 'production';
}