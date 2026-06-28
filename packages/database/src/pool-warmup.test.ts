import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from './database-manager.js';
import { resolvePoolWarmupEnabled } from './pool-warmup.js';

describe('resolvePoolWarmupEnabled', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    poolWarmup: process.env.DB_POOL_WARMUP,
  };

  afterEach(() => {
    process.env.NODE_ENV = previous.nodeEnv;
    process.env.DB_POOL_WARMUP = previous.poolWarmup;
  });

  it('defaults to production only', () => {
    delete process.env.DB_POOL_WARMUP;
    process.env.NODE_ENV = 'production';
    expect(resolvePoolWarmupEnabled()).toBe(true);

    process.env.NODE_ENV = 'development';
    expect(resolvePoolWarmupEnabled()).toBe(false);
  });

  it('respects DB_POOL_WARMUP env override', () => {
    process.env.NODE_ENV = 'development';
    process.env.DB_POOL_WARMUP = 'true';
    expect(resolvePoolWarmupEnabled()).toBe(true);

    process.env.NODE_ENV = 'production';
    process.env.DB_POOL_WARMUP = 'false';
    expect(resolvePoolWarmupEnabled()).toBe(false);
  });

  it('respects config.poolWarmup when env is unset', () => {
    delete process.env.DB_POOL_WARMUP;
    process.env.NODE_ENV = 'development';
    expect(resolvePoolWarmupEnabled({ poolWarmup: true })).toBe(true);
  });
});

describe('DatabaseManager.warmPools', () => {
  it('runs SELECT 1 against configured connections', async () => {
    const manager = new DatabaseManager({
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', database: ':memory:' },
      },
    });

    await expect(manager.warmPools()).resolves.toBeUndefined();
  });
});