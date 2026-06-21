import { randomUUID } from 'node:crypto';
import type { Job } from './job.js';
import { serializeJob } from './payload.js';
import type { QueueContract } from './queue-contract.js';
import type { SerializedJobPayload } from './types.js';
import type { QueueWorker } from './worker.js';

export class SyncQueue implements QueueContract {
  constructor(private readonly worker: QueueWorker) {}

  async push(job: Job, _queue = 'default'): Promise<string> {
    return this.pushRaw(serializeJob(job), _queue);
  }

  async pushRaw(payload: SerializedJobPayload, queue = 'default'): Promise<string> {
    const id = randomUUID();
    await this.worker.process(
      payload,
      async (next) => {
        await this.pushRaw(next, queue);
      },
      queue,
    );
    return id;
  }

  async later(delaySeconds: number, job: Job, queue = 'default'): Promise<string> {
    if (delaySeconds > 0) {
      await sleep(delaySeconds * 1000);
    }
    return this.push(job, queue);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}