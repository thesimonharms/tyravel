import { LocalDisk } from './local-disk.js';
import type {
  DiskConfig,
  Filesystem,
  LocalDiskConfig,
  StorageConfig,
  StorageDriverFactory,
} from './types.js';

export class StorageManager {
  private static readonly drivers = new Map<string, StorageDriverFactory>();

  private readonly disks = new Map<string, Filesystem>();

  constructor(private readonly config: StorageConfig) {}

  static extend(name: string, factory: StorageDriverFactory): void {
    StorageManager.drivers.set(name, factory);
  }

  disk(name?: string): Filesystem {
    const diskName = name ?? this.config.default;
    const existing = this.disks.get(diskName);
    if (existing) {
      return existing;
    }

    const config = this.config.disks[diskName];
    if (!config) {
      throw new Error(`Storage disk [${diskName}] is not configured.`);
    }

    const disk = this.buildDisk(config);
    this.disks.set(diskName, disk);
    return disk;
  }

  private buildDisk(config: DiskConfig): Filesystem {
    switch (config.driver) {
      case 'local':
        return new LocalDisk((config as LocalDiskConfig).root);
      default: {
        const factory = StorageManager.drivers.get(config.driver);
        if (factory) {
          return factory(config);
        }
        throw new Error(
          `Unsupported storage driver [${config.driver}]. Register it with StorageManager.extend() or install a driver package.`,
        );
      }
    }
  }
}