import { decodePayload } from '@pondoknusa/queue';
import type { FailedJobRecord, FailedJobRepository } from '@pondoknusa/queue';

const SEND_QUEUED_NOTIFICATION = 'SendQueuedNotification';

export class FailedNotificationRepository {
  constructor(private readonly failedJobs: FailedJobRepository) {}

  async all(limit = 50): Promise<FailedJobRecord[]> {
    const records = await this.failedJobs.all(limit);
    return records.filter((record) => {
      try {
        return decodePayload(record.payload).job === SEND_QUEUED_NOTIFICATION;
      } catch {
        return false;
      }
    });
  }

  async find(id: number): Promise<FailedJobRecord | null> {
    const record = await this.failedJobs.find(id);
    if (!record) {
      return null;
    }
    try {
      return decodePayload(record.payload).job === SEND_QUEUED_NOTIFICATION ? record : null;
    } catch {
      return null;
    }
  }

  async retry(
    id: number,
    push: Parameters<FailedJobRepository['retry']>[1],
  ): Promise<boolean> {
    const record = await this.find(id);
    if (!record) {
      return false;
    }
    return this.failedJobs.retry(id, push);
  }
}