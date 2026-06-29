import { Mailable } from '@pondoknusa/mail';
import type { MailMessage } from '@pondoknusa/mail';

export class WelcomeMail extends Mailable {
  constructor(private readonly name: string) {
    super();
  }

  override shouldQueue(): boolean {
    return true;
  }

  build(): MailMessage {
    return {
      subject: 'Welcome to Pondoknusa',
      to: [],
      text: `Hi ${this.name}, welcome aboard!`,
    };
  }
}