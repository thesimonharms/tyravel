import { describe, expect, it } from 'vitest';
import { ArrayStore } from '@pondoknusa/cache';
import { BatchRepository } from './batch.js';
import { Dispatcher } from './dispatcher.js';
import { Job } from './job.js';
import { JobRegistry } from './registry.js';
import { SyncQueue } from './sync-queue.js';
import { QueueWorker } from './worker.js';

class StepJob extends Job<{ step: number; log: number[] }> {
  override async handle(): Promise<void> {
    this.data.log.push(this.data.step);
  }
}

class FailJob extends Job<Record<string, never>> {
  override async handle(): Promise<void> {
    throw new Error('batch failure');
  }
}

function createSyncStack() {
  const registry = new JobRegistry().register(StepJob).register(FailJob);
  const cache = new ArrayStore();
  const batchRepository = new BatchRepository(cache);
  const worker = new QueueWorker(registry, undefined, { batchRepository });
  const queue = new SyncQueue(worker);
  const dispatcher = new Dispatcher(queue, batchRepository);
  return { dispatcher, batchRepository, cache };
}

describe('Job chains', () => {
  it('runs chained jobs in order on the sync driver', async () => {
    const log: number[] = [];
    const { dispatcher } = createSyncStack();

    await dispatcher.chain([
      new StepJob({ step: 1, log }),
      new StepJob({ step: 2, log }),
      new StepJob({ step: 3, log }),
    ]).dispatch();

    expect(log).toEqual([1, 2, 3]);
  });
});

describe('Job batches', () => {
  it('tracks pending and finished jobs in cache', async () => {
    const log: number[] = [];
    const { dispatcher, batchRepository } = createSyncStack();

    const state = await dispatcher.batch([
      new StepJob({ step: 1, log }),
      new StepJob({ step: 2, log }),
    ]).name('imports').dispatch();

    const finished = await batchRepository.find(state.id);
    expect(finished?.name).toBe('imports');
    expect(finished?.totalJobs).toBe(2);
    expect(finished?.pendingJobs).toBe(0);
    expect(finished?.failedJobs).toBe(0);
    expect(finished?.finishedAt).not.toBeNull();
    expect(log).toEqual([1, 2]);
  });

  it('records failed jobs in the batch state', async () => {
    const registry = new JobRegistry().register(FailJob);
    const cache = new ArrayStore();
    const batchRepository = new BatchRepository(cache);
    const worker = new QueueWorker(registry, undefined, { batchRepository });
    const state = await batchRepository.create('failures', 1);

    await expect(
      worker.process({ job: 'FailJob', data: {}, batchId: state.id }),
    ).rejects.toThrow('batch failure');

    const finished = await batchRepository.find(state.id);
    expect(finished?.failedJobs).toBe(1);
    expect(finished?.pendingJobs).toBe(0);
    expect(finished?.finishedAt).not.toBeNull();
  });
});