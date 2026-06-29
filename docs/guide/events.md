# Events

Register `EventServiceProvider` and map listeners in `config/events.ts`:

```typescript
import { UserRegistered } from '../events/user-registered.js';
import { SendWelcomeEmail } from '../listeners/send-welcome-email.js';

export default {
  listen: [
    [UserRegistered, [SendWelcomeEmail]],
  ],
} satisfies import('@pondoknusa/events').EventsConfig;
```

## Firing events

```typescript
import { fire, Events } from '@pondoknusa/core';

await fire(new UserRegistered(user));
await Events.dispatch(new OrderShipped(order));
```

## Subscribers

Group multiple listener mappings in a subscriber class:

```bash
pondoknusa make:subscriber UserEventSubscriber
```

Register the subscriber in `config/events.ts` under `subscribe`.