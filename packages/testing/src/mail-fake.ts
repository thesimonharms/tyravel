import type { Application } from '@pondoknusa/core';
import { ArrayMailTransport, MailManager } from '@pondoknusa/mail';
import type { MailMessage } from '@pondoknusa/mail';

export class MailFake {
  constructor(readonly transport: ArrayMailTransport) {}

  get messages(): MailMessage[] {
    return this.transport.messages;
  }

  assertSent(predicate: (message: MailMessage) => boolean): void {
    if (!this.messages.some(predicate)) {
      throw new Error('Expected mail was not sent.');
    }
  }

  assertNothingSent(): void {
    if (this.messages.length > 0) {
      throw new Error(`${this.messages.length} unexpected mail message(s) were sent.`);
    }
  }

  clear(): void {
    this.transport.messages.length = 0;
  }
}

export function mailFake(app: Application): MailFake {
  const manager = new MailManager({
    default: 'array',
    from: { address: 'test@example.com' },
    connections: { array: { driver: 'array' } },
  });
  app.instance('mail', manager);
  return new MailFake(manager.transport('array') as ArrayMailTransport);
}