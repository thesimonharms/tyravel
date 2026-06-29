import { Job } from '@pondoknusa/queue';
import type { MailMessage } from './types.js';
import { getQueuedMailContext } from './queued-mail-context.js';

export interface SendMailableData extends Record<string, unknown> {
  mailConnection: string;
  message: MailMessage;
}

export class SendMailable extends Job<SendMailableData> {
  override async handle(): Promise<void> {
    const { manager } = getQueuedMailContext();
    await manager.mailer(this.data.mailConnection).send(this.data.message);
  }
}