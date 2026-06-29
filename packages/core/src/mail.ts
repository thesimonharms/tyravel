import type { MailManager, Mailer, Mailable, MailMessage } from '@pondoknusa/mail';
import type { Application } from './application.js';

let mailApplication: Application | undefined;

export function setMailApplication(app: Application): void {
  mailApplication = app;
}

function resolveMail(): MailManager {
  if (!mailApplication) {
    throw new Error('Mail facade is not ready. Boot the application first.');
  }
  return mailApplication.make<MailManager>('mail');
}

export interface MailFacade {
  mailer(connection?: string): Mailer;
  to(address: Parameters<Mailer['to']>[0]): Mailer;
  send(mailable: Mailable | MailMessage): Promise<void>;
}

export const Mail: MailFacade = {
  mailer: (connection) => resolveMail().mailer(connection),
  to: (address) => resolveMail().mailer().to(address),
  send: (mailable) => resolveMail().mailer().send(mailable),
};