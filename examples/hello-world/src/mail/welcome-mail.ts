import { Mailable } from '@tyravel/mail';
import type { MailMessage } from '@tyravel/mail';

export class WelcomeMail extends Mailable {
  constructor(private readonly name: string) {
    super();
  }

  override shouldQueue(): boolean {
    return true;
  }

  build(): MailMessage {
    return {
      subject: 'Welcome to Tyravel',
      to: [],
      text: `Hi ${this.name}, welcome aboard!`,
    };
  }
}