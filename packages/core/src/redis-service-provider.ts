import { ConfigRepository } from '@pondoknusa/config';
import { RedisManager, type RedisConfig } from '@pondoknusa/redis';
import { ServiceProvider } from './service-provider.js';

export class RedisServiceProvider extends ServiceProvider {
  override async register() {
    const config = this.app.make<ConfigRepository>('config');
    const redisConfig = config.get<RedisConfig>('redis');
    const manager = new RedisManager(redisConfig);

    this.app.instance('redis', manager);
    this.app.singleton(RedisManager, () => manager);
  }
}