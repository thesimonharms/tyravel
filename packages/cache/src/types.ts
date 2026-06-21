export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  put(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  forget(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  flush(): Promise<void>;
}

export interface ArrayStoreConfig {
  driver: 'array';
}

export interface FileStoreConfig {
  driver: 'file';
  path: string;
}

export interface RedisStoreConfig {
  driver: 'redis';
  connection?: string;
  prefix?: string;
}

export type CacheConnectionConfig = ArrayStoreConfig | FileStoreConfig | RedisStoreConfig;

export interface CacheConfig {
  default: string;
  prefix?: string;
  connections: Record<string, CacheConnectionConfig>;
}