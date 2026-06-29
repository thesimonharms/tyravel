import { ConfigRepository } from '@pondoknusa/config';
import {
  StorageManager,
  StorageRepository,
  type StorageConfig,
} from '@pondoknusa/storage';
import { ServiceProvider } from './service-provider.js';

export class StorageServiceProvider extends ServiceProvider {
  override async register() {
    const config = this.app.make<ConfigRepository>('config');
    const storageConfig = config.get<StorageConfig>('filesystems');
    const manager = new StorageManager(storageConfig);
    const repository = new StorageRepository(manager);

    this.app.instance('storage', repository);
    this.app.singleton(StorageManager, () => manager);
    this.app.singleton(StorageRepository, () => repository);
  }
}