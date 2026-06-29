import type { RedisClient, RedisManager } from '@pondoknusa/redis';
import type { Job } from './job.js';
import { decodePayload, encodePayload, serializeJob } from './payload.js';
import type { QueueContract } from './queue-contract.js';
import type {
  QueueJobRecord,
  RedisQueueConnectionConfig,
  SerializedJobPayload,
} from './types.js';
import type { WorkerQueue } from './worker-queue.js';

interface RedisJobEnvelope {
  id: number;
  queue: string;
  payload: string;
  attempts: number;
  reservedAt: number | null;
  availableAt: number;
  createdAt: number;
}

export class RedisQueue implements QueueContract, WorkerQueue {
  private readonly redisConnection: string;
  private readonly prefix: string;
  private readonly retryAfter: number;
  private readonly blockTimeout: number;

  constructor(
    private readonly redis: RedisManager,
    config: RedisQueueConnectionConfig = { driver: 'redis' },
  ) {
    this.redisConnection = config.connection ?? 'default';
    this.prefix = config.prefix ?? 'pondoknusa:';
    this.retryAfter = config.retryAfter ?? 90;
    this.blockTimeout = config.blockTimeout ?? 1;
  }

  async push(job: Job, queue = 'default'): Promise<string> {
    return this.pushRaw(serializeJob(job), queue);
  }

  async pushRaw(payload: SerializedJobPayload, queue = 'default'): Promise<string> {
    const client = await this.client();
    const id = await client.incr(this.idsKey());
    const envelope = this.createEnvelope(id, queue, encodePayload(payload));
    await this.saveEnvelope(client, envelope);
    await client.lPush(this.readyKey(queue), String(id));
    return String(id);
  }

  async later(delaySeconds: number, job: Job, queue = 'default'): Promise<string> {
    const client = await this.client();
    const id = await client.incr(this.idsKey());
    const envelope = this.createEnvelope(id, queue, encodePayload(serializeJob(job)));
    envelope.availableAt = unixNow() + delaySeconds;
    await this.saveEnvelope(client, envelope);
    await client.zAdd(this.delayedKey(queue), {
      score: envelope.availableAt,
      value: String(id),
    });
    return String(id);
  }

  async pop(queue = 'default'): Promise<QueueJobRecord | null> {
    const client = await this.client();
    await this.promoteDelayed(client, queue);

    const blocked = await client.brPop(this.readyKey(queue), this.blockTimeout);
    const element = blocked?.element ?? (await client.rPop(this.readyKey(queue)));
    if (!element) {
      return null;
    }

    const id = Number(element);
    const envelope = await this.loadEnvelope(client, id);
    if (!envelope) {
      return null;
    }

    const now = unixNow();
    envelope.reservedAt = now;
    await this.saveEnvelope(client, envelope);
    await client.zAdd(this.reservedKey(queue), {
      score: now + this.retryAfter,
      value: String(id),
    });

    return mapEnvelope(envelope);
  }

  async deleteJob(id: number): Promise<void> {
    const client = await this.client();
    const envelope = await this.loadEnvelope(client, id);
    if (!envelope) {
      return;
    }

    await client.del(this.jobKey(id));
    await client.zRem(this.reservedKey(envelope.queue), String(id));
    await client.zRem(this.delayedKey(envelope.queue), String(id));
  }

  async release(id: number, delaySeconds = 0): Promise<void> {
    const client = await this.client();
    const envelope = await this.loadEnvelope(client, id);
    if (!envelope) {
      return;
    }

    envelope.attempts += 1;
    envelope.reservedAt = null;
    envelope.availableAt = unixNow() + delaySeconds;
    await this.saveEnvelope(client, envelope);
    await client.zRem(this.reservedKey(envelope.queue), String(id));
    await client.zAdd(this.delayedKey(envelope.queue), {
      score: envelope.availableAt,
      value: String(id),
    });
  }

  decode(record: QueueJobRecord): SerializedJobPayload {
    return decodePayload(record.payload);
  }

  getRetryAfter(): number {
    return this.retryAfter;
  }

  private async client(): Promise<RedisClient> {
    return this.redis.connection(this.redisConnection);
  }

  private createEnvelope(id: number, queue: string, payload: string): RedisJobEnvelope {
    const now = unixNow();
    return {
      id,
      queue,
      payload,
      attempts: 0,
      reservedAt: null,
      availableAt: now,
      createdAt: now,
    };
  }

  private async promoteDelayed(client: RedisClient, queue: string): Promise<void> {
    const now = unixNow();
    const ids = await client.zRangeByScore(this.delayedKey(queue), 0, now);
    for (const id of ids) {
      await client.zRem(this.delayedKey(queue), id);
      await client.lPush(this.readyKey(queue), id);
    }
  }

  private async saveEnvelope(client: RedisClient, envelope: RedisJobEnvelope): Promise<void> {
    await client.set(this.jobKey(envelope.id), JSON.stringify(envelope));
  }

  private async loadEnvelope(client: RedisClient, id: number): Promise<RedisJobEnvelope | null> {
    const raw = await client.get(this.jobKey(id));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as RedisJobEnvelope;
  }

  private idsKey(): string {
    return `${this.prefix}queue:ids`;
  }

  private jobKey(id: number): string {
    return `${this.prefix}queue:job:${id}`;
  }

  private readyKey(queue: string): string {
    return `${this.prefix}queue:${queue}:ready`;
  }

  private delayedKey(queue: string): string {
    return `${this.prefix}queue:${queue}:delayed`;
  }

  private reservedKey(queue: string): string {
    return `${this.prefix}queue:${queue}:reserved`;
  }
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function mapEnvelope(envelope: RedisJobEnvelope): QueueJobRecord {
  return {
    id: envelope.id,
    queue: envelope.queue,
    payload: envelope.payload,
    attempts: envelope.attempts,
    reservedAt: envelope.reservedAt,
    availableAt: envelope.availableAt,
    createdAt: envelope.createdAt,
  };
}