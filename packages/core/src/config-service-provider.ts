import { ConfigRepository, loadConfig, loadEnv } from '@tyravel/config';
import { ServiceProvider } from './service-provider.js';

export class ConfigServiceProvider extends ServiceProvider {
  override async register() {
    await loadEnv(this.app.basePath);
    const config = await loadConfig(this.app.basePath);
    const repository = new ConfigRepository(config);

    this.app.instance('config', repository);
    this.app.singleton(ConfigRepository, () => repository);
  }
}