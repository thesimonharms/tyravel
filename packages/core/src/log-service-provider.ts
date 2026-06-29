import { ConfigRepository } from '@pondoknusa/config';
import { LogManager, LogRepository, type LogConfig } from '@pondoknusa/log';
import { ServiceProvider } from './service-provider.js';

export class LogServiceProvider extends ServiceProvider {
  override async register() {
    const config = this.app.make<ConfigRepository>('config');
    const logConfig = config.get<LogConfig>('log');
    const manager = new LogManager(logConfig);
    const repository = new LogRepository(manager);

    this.app.instance('log', repository);
    this.app.singleton(LogManager, () => manager);
    this.app.singleton(LogRepository, () => repository);
  }
}