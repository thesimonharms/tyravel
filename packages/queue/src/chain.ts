import type { Job } from './job.js';
import { serializeJob } from './payload.js';
import type { QueueContract } from './queue-contract.js';

export class Chain {
  constructor(
    private readonly jobs: Job[],
    private readonly queue: QueueContract,
    private readonly queueName = 'default',
  ) {}

  onQueue(queueName: string): Chain {
    return new Chain(this.jobs, this.queue, queueName);
  }

  async dispatch(): Promise<string> {
    if (this.jobs.length === 0) {
      throw new Error('Cannot dispatch an empty job chain');
    }

    const first = this.jobs[0]!;
    const rest = this.jobs.slice(1);
    const payload = serializeJob(first);
    if (rest.length > 0) {
      payload.chain = rest.map((job) => serializeJob(job));
    }

    return this.queue.pushRaw(payload, this.queueName);
  }
}