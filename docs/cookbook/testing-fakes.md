# Testing with fakes

Assert side effects without hitting real mail, notification, or broadcast drivers.

## Setup

```typescript
import { TestCase } from '@pondoknusa/testing';
import { mailFake, notificationFake, broadcastFake } from '@pondoknusa/testing';

class FeatureTest extends TestCase {
  async setUp() {
    await super.setUp();
    mailFake();
    notificationFake();
    broadcastFake();
  }
}
```

## Assertions

```typescript
import { Mail } from '@pondoknusa/core';

await Mail.to('ada@example.com').send(new WelcomeMail(user));

expect(Mail.sent()).toHaveLength(1);
expect(Mail.sent()[0]?.mailable).toBeInstanceOf(WelcomeMail);
```

Notification and broadcast fakes follow the same pattern — see [Testing](/guide/testing) for HTTP sugar (`actingAs`, `withCsrf`), database transactions, and snapshot helpers added in **v0.15**.