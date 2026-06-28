import type { EventsConfig } from '@tyravel/events';

export default {
  listen: [],
  subscribers: [],
  queueConnection: 'database',
  queue: 'default',
} satisfies EventsConfig;
