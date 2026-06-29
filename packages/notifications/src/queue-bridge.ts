import type { Job } from '@pondoknusa/queue';

export interface NotificationQueueBridge {
  dispatch(job: Job, options?: { connection?: string; queue?: string; delaySeconds?: number }): Promise<void>;
}