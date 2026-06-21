export interface Filesystem {
  put(path: string, contents: string | Buffer): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<boolean>;
  url(path: string): string;
}

export interface LocalDiskConfig {
  driver: 'local';
  root: string;
}

export type DiskConfig =
  | LocalDiskConfig
  | ({ driver: string } & Record<string, unknown>);

export interface StorageConfig {
  default: string;
  disks: Record<string, DiskConfig>;
}

export type StorageDriverFactory = (config: DiskConfig) => Filesystem;