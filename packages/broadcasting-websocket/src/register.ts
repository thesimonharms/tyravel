import {
  BroadcastManager,
  setBroadcastWebSocketUpgrade,
  PONDOKNUSA_BROADCAST_REDIS_CHANNEL,
} from '@pondoknusa/broadcasting';
import type { RedisManager } from '@pondoknusa/redis';
import type { WebSocketBroadcastConnectionConfig } from '@pondoknusa/broadcasting';
import { WebSocketBroadcaster } from './websocket-broadcaster.js';
import { WebSocketHub } from './websocket-hub.js';

let redisManager: RedisManager | undefined;
let hub: WebSocketHub | undefined;
let redisSubscriberStarted = false;
let redisSubscriberPromise: Promise<void> | undefined;

export function setWebSocketRedisManager(manager: RedisManager): void {
  redisManager = manager;
}

export function getWebSocketHub(): WebSocketHub | undefined {
  return hub;
}

export function resetWebSocketBroadcastDriverState(): void {
  redisSubscriberStarted = false;
  redisSubscriberPromise = undefined;
  redisManager = undefined;
  hub = undefined;
}

export function waitForWebSocketRedisSubscriber(): Promise<void> {
  return redisSubscriberPromise ?? Promise.resolve();
}

export function registerWebSocketBroadcastDriver(): void {
  BroadcastManager.extend('websocket', (config) => {
    if (!redisManager) {
      throw new Error('Redis manager is required for the websocket broadcast driver.');
    }

    const wsConfig = config as WebSocketBroadcastConnectionConfig;
    hub ??= new WebSocketHub(wsConfig.path);
    setBroadcastWebSocketUpgrade((server) => {
      hub?.attach(server);
    });
    void startRedisSubscriber(wsConfig);

    return new WebSocketBroadcaster(redisManager, wsConfig);
  });
}

async function startRedisSubscriber(config: WebSocketBroadcastConnectionConfig): Promise<void> {
  if (redisSubscriberStarted) {
    await redisSubscriberPromise;
    return;
  }
  if (!redisManager || !hub) {
    return;
  }

  redisSubscriberStarted = true;
  redisSubscriberPromise = (async () => {
    const client = await redisManager!.connection(config.redisConnection ?? 'default');
    await client.subscribe(config.channel ?? PONDOKNUSA_BROADCAST_REDIS_CHANNEL, (message) => {
      hub?.handleRedisMessage(message);
    });
  })();
  await redisSubscriberPromise;
}