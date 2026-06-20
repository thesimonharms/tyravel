import { env } from '@tyravel/config';
import type { EventsConfig } from '@tyravel/events';
import { UserRegistered } from '../src/events/user-registered.js';
import { SendWelcomeEmail } from '../src/listeners/send-welcome-email.js';

export default {
  listen: [[UserRegistered, [SendWelcomeEmail]]],
  subscribers: [],
  queueConnection: env('QUEUE_CONNECTION', 'database'),
  queue: 'default',
} satisfies EventsConfig;