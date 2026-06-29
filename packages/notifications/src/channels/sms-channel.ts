import type { Notification } from '../notification.js';
import type { Notifiable } from '../types.js';

export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
}

/**
 * Twilio-compatible SMS adapter stub. Replace `sendSms` with your provider SDK.
 */
export type SmsTransport = (message: SmsMessage) => Promise<void>;

let smsTransport: SmsTransport = async (message) => {
  console.log(`[sms] ${message.from ?? 'Pondoknusa'} → ${message.to}: ${message.body}`);
};

export function setSmsTransport(transport: SmsTransport): void {
  smsTransport = transport;
}

export class SmsChannel {
  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toSms) {
      throw new Error(`Notification ${notification.id()} does not implement toSms().`);
    }

    const message = await notification.toSms(notifiable);
    await smsTransport(message);
  }
}