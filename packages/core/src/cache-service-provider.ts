import { ConfigRepository } from '@pondoknusa/config';
import { CacheManager, CacheRepository, type CacheConfig } from '@pondoknusa/cache';
import { RedisManager } from '@pondoknusa/redis';
import { ServiceProvider } from './service-provider.js';

export class CacheServiceProvider extends ServiceProvider {
  override async register() {
    const config = this.app.make<ConfigRepository>('config');
    const cacheConfig = config.get<CacheConfig>('cache');
    const manager = new CacheManager(cacheConfig, this.resolveRedisManager());
    const repository = new CacheRepository(manager);

    this.app.instance('cache', repository);
    this.app.singleton(CacheManager, () => manager);
    this.app.singleton(CacheRepository, () => repository);
  }

  private resolveRedisManager(): RedisManager | undefined {
    try {
      return this.app.make<RedisManager>('redis');
    } catch {
      return undefined;
    }
  }
}