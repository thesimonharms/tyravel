import { ConfigRepository, loadEnv, resolveConfigForBoot } from '@tyravel/config';
import { ServiceProvider } from './service-provider.js';

export class ConfigServiceProvider extends ServiceProvider {
  override async register() {
    await loadEnv(this.app.basePath);
    const boot = await resolveConfigForBoot(this.app.basePath);
    const repository = new ConfigRepository(boot.config);

    this.app.instance('config', repository);
    this.app.singleton(ConfigRepository, () => repository);
    this.app.instance('tyravel.configCache', {
      loaded: boot.loaded,
      message: boot.message,
    });
  }
}