import type { Container } from '@pondoknusa/container';
import type { BatchRepository } from './batch.js';
import type { JobRegistry } from './registry.js';
import type { SerializedJobPayload } from './types.js';

export type JobContinuer = (payload: SerializedJobPayload, queue?: string) => Promise<void>;

export interface QueueWorkerProcessResult {
  payload: SerializedJobPayload;
  queue: string;
  durationMs: number;
  error?: unknown;
}

export type QueueWorkerProcessHook = (result: QueueWorkerProcessResult) => void | Promise<void>;

let processHook: QueueWorkerProcessHook | undefined;

export function setQueueWorkerProcessHook(hook: QueueWorkerProcessHook | undefined): void {
  processHook = hook;
}

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
    const start = performance.now();
    let error: unknown;

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
    } catch (caught) {
      error = caught;
      if (payload.batchId && this.options.batchRepository) {
        await this.options.batchRepository.recordFailedJob(payload.batchId);
      }
      throw caught;
    } finally {
      if (processHook) {
        await processHook({
          payload,
          queue: queueName,
          durationMs: performance.now() - start,
          error,
        });
      }
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