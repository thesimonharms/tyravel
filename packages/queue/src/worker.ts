import type { Container } from '@tyravel/container';
import type { BatchRepository } from './batch.js';
import type { JobRegistry } from './registry.js';
import type { SerializedJobPayload } from './types.js';

export type JobContinuer = (payload: SerializedJobPayload, queue?: string) => Promise<void>;

export interface QueueWorkerOptions {
  maxAttempts?: number;
  batchRepository?: BatchRepository;
}

export class QueueWorker {
  constructor(
    private readonly registry: JobRegistry,
    private readonly container?: Container,
    private readonly options: QueueWorkerOptions = {},
  ) {}

  async process(
    payload: SerializedJobPayload,
    continuer?: JobContinuer,
    queueName = 'default',
  ): Promise<void> {
    try {
      const job = this.registry.create(payload.job, payload.data);
      if (this.container) {
        await this.container.call(job.handle.bind(job));
      } else {
        await job.handle();
      }

      if (payload.batchId && this.options.batchRepository) {
        await this.options.batchRepository.recordSuccessfulJob(payload.batchId);
      }
    } catch (error) {
      if (payload.batchId && this.options.batchRepository) {
        await this.options.batchRepository.recordFailedJob(payload.batchId);
      }
      throw error;
    }

    if (payload.chain && payload.chain.length > 0 && continuer) {
      const next = payload.chain[0]!;
      const rest = payload.chain.slice(1);
      await continuer(
        {
          ...next,
          chain: rest.length > 0 ? rest : undefined,
        },
        queueName,
      );
    }
  }

  getMaxAttempts(): number {
    return this.options.maxAttempts ?? 3;
  }
}