import { randomUUID } from 'node:crypto';
import type { CacheStore } from '@tyravel/cache';
import type { Job } from './job.js';
import { serializeJob } from './payload.js';
import type { QueueContract } from './queue-contract.js';

export interface BatchState {
  id: string;
  name: string;
  totalJobs: number;
  pendingJobs: number;
  failedJobs: number;
  createdAt: number;
  finishedAt: number | null;
  cancelledAt: number | null;
}

export class BatchRepository {
  constructor(
    private readonly cache: CacheStore,
    private readonly prefix = 'tyravel_batch:',
  ) {}

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  async create(name: string, totalJobs: number): Promise<BatchState> {
    const state: BatchState = {
      id: randomUUID(),
      name,
      totalJobs,
      pendingJobs: totalJobs,
      failedJobs: 0,
      createdAt: Date.now(),
      finishedAt: null,
      cancelledAt: null,
    };
    await this.cache.put(this.key(state.id), state);
    return state;
  }

  async find(id: string): Promise<BatchState | null> {
    return this.cache.get<BatchState>(this.key(id));
  }

  async cancel(id: string): Promise<BatchState | null> {
    const state = await this.find(id);
    if (!state) {
      return null;
    }
    state.cancelledAt = Date.now();
    await this.cache.put(this.key(id), state);
    return state;
  }

  async recordSuccessfulJob(id: string): Promise<BatchState | null> {
    const state = await this.find(id);
    if (!state || state.cancelledAt) {
      return state;
    }

    state.pendingJobs = Math.max(0, state.pendingJobs - 1);
    if (state.pendingJobs === 0 && state.failedJobs === 0) {
      state.finishedAt = Date.now();
    }
    await this.cache.put(this.key(id), state);
    return state;
  }

  async recordFailedJob(id: string): Promise<BatchState | null> {
    const state = await this.find(id);
    if (!state || state.cancelledAt) {
      return state;
    }

    state.failedJobs += 1;
    state.pendingJobs = Math.max(0, state.pendingJobs - 1);
    if (state.pendingJobs === 0) {
      state.finishedAt = Date.now();
    }
    await this.cache.put(this.key(id), state);
    return state;
  }
}

export class PendingBatch {
  private batchName = '';

  constructor(
    private readonly jobs: Job[],
    private readonly queue: QueueContract,
    private readonly repository: BatchRepository,
    private readonly queueName = 'default',
  ) {}

  name(name: string): this {
    this.batchName = name;
    return this;
  }

  onQueue(queueName: string): PendingBatch {
    return new PendingBatch(this.jobs, this.queue, this.repository, queueName);
  }

  async dispatch(): Promise<BatchState> {
    if (this.jobs.length === 0) {
      throw new Error('Cannot dispatch an empty job batch');
    }

    const state = await this.repository.create(this.batchName, this.jobs.length);
    for (const job of this.jobs) {
      const payload = serializeJob(job);
      payload.batchId = state.id;
      await this.queue.pushRaw(payload, this.queueName);
    }
    return state;
  }
}