import { CacheManager } from '@pondoknusa/cache';
import { DynamoDbStore, type DynamoDbStoreConfig } from './dynamodb-store.js';

export { DynamoDbStore, type DynamoDbStoreConfig } from './dynamodb-store.js';

export function registerDynamoDbCacheDriver(): void {
  CacheManager.extend('dynamodb', (config) => new DynamoDbStore(config as unknown as DynamoDbStoreConfig));
}