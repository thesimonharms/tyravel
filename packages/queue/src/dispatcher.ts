import { Chain } from './chain.js';
import { PendingBatch, type BatchRepository } from './batch.js';
import type { Job } from './job.js';
import type { QueueContract } from './queue-contract.js';

export class Dispatcher {
  constructor(
    private readonly queue: QueueContract,
    private readonly batchRepository?: BatchRepository,
  ) {}

  dispatch(job: Job, queue?: string): Promise<string> {
    return this.queue.push(job, queue);
  }

  dispatchLater(delaySeconds: number, job: Job, queue?: string): Promise<string> {
    return this.queue.later(delaySeconds, job, queue);
  }

  chain(jobs: Job[], queue = 'default'): Chain {
    return new Chain(jobs, this.queue, queue);
  }

  batch(jobs: Job[], queue = 'default'): PendingBatch {
    if (!this.batchRepository) {
      throw new Error('Batch repository is not configured for this queue stack');
    }
    return new PendingBatch(jobs, this.queue, this.batchRepository, queue);
  }
}