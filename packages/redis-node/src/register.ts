import { RedisManager } from '@pondoknusa/redis';
import { createNodeRedisClient } from './client-factory.js';

export function registerNodeRedisDriver(): void {
  RedisManager.useClientFactory(createNodeRedisClient);
}