import type { Job } from '@tyravel/queue';

export interface MailQueueBridge {
  dispatch(
    job: Job,
    options?: { connection?: string; queue?: string; delaySeconds?: number },
  ): Promise<void>;
}