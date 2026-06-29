import type { EventsConfig } from '@pondoknusa/events';

export default {
  listen: [],
  subscribers: [],
  queueConnection: 'database',
  queue: 'default',
} satisfies EventsConfig;
