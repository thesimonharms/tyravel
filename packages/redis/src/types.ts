export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string>;
  lPush(key: string, ...elements: string[]): Promise<number>;
  rPop(key: string): Promise<string | null>;
  brPop(key: string, timeout: number): Promise<{ key: string; element: string } | null>;
  zAdd(key: string, entry: { score: number; value: string }): Promise<number>;
  zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]>;
  zRem(key: string, ...members: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  quit(): Promise<string>;
}

export interface RedisConnectionConfig {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: number;
}

export interface RedisConfig {
  default: string;
  prefix?: string;
  connections: Record<string, RedisConnectionConfig>;
}

export type RedisClientFactory = (config: RedisConnectionConfig) => Promise<RedisClient>;