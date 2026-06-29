import type { MailManager } from '@pondoknusa/mail';
import type { Notification } from '../notification.js';
import type { Notifiable } from '../types.js';

export class MailChannel {
  constructor(private readonly mail: MailManager) {}

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toMail) {
      throw new Error(`Notification ${notification.id()} does not implement toMail().`);
    }
    const message = await notification.toMail(notifiable);
    if (notification.locale) {
      message.locale = notification.locale;
    }
    const address = notifiable.routeNotificationForMail?.();
    const recipient =
      typeof address === 'string' ? address : address?.address;
    if (!recipient) {
      throw new Error('Notifiable is missing routeNotificationForMail().');
    }
    await this.mail.mailer().to(recipient).send(message);
  }
}