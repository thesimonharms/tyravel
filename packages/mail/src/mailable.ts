import type { MailMessage } from './types.js';

export abstract class Mailable {
  abstract build(): MailMessage | Promise<MailMessage>;

  /** When true, the mailable is pushed to the queue instead of sent immediately. */
  shouldQueue?(): boolean;

  connection?: string;
  queue?: string;
  delaySeconds?: number;

  async toMessage(): Promise<MailMessage> {
    return this.build();
  }
}