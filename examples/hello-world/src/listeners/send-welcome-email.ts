import { QueuedListener } from '@pondoknusa/events';
import { Mail } from '@pondoknusa/core';
import type { UserRegistered } from '../events/user-registered.js';
import { WelcomeMail } from '../mail/welcome-mail.js';

export class SendWelcomeEmail extends QueuedListener<UserRegistered> {
  override async handle(event: UserRegistered): Promise<void> {
    await Mail.to(event.data.email).send(new WelcomeMail(event.data.name));
  }
}