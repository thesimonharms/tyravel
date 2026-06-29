# Notifications

Register `NotificationServiceProvider` (which registers `MailServiceProvider` as a dependency) and add `config/notifications.ts`:

```typescript
export default {
  table: 'notifications',
  connection: 'sqlite',
  queue: 'default',
  queueConnection: 'database',
} as const;
```

Run the notifications table migration:

```bash
pondoknusa migrate
```

## Sending notifications

Use the `Notifications` facade:

```typescript
import { Notifications } from '@pondoknusa/core';

// Queued when the notification implements ShouldQueue
await Notifications.send(user, new WelcomeNotification(user));

// Deliver immediately, bypassing the queue
await Notifications.sendNow(user, new WelcomeNotification(user));
```

## Notification classes

Extend `Notification` and implement `via()` to declare delivery channels:

```typescript
import { Notification, type Notifiable } from '@pondoknusa/notifications';
import type { MailMessage } from '@pondoknusa/mail';

export class WelcomeNotification extends Notification {
  constructor(private readonly user: { email: string; name: string }) {
    super();
  }

  via(notifiable: Notifiable): string[] {
    return ['mail', 'database'];
  }

  toMail(notifiable: Notifiable): MailMessage {
    return {
      subject: 'Welcome!',
      htmlView: 'notifications::mail.html',
      textView: 'notifications::mail.text',
      viewData: { name: this.user.name },
    };
  }

  toDatabase(notifiable: Notifiable): Record<string, unknown> {
    return {
      message: `Welcome, ${this.user.name}!`,
      user_id: notifiable.getKey(),
    };
  }
}
```

## Channels

| Channel | Description |
|---------|-------------|
| `mail` | Sends via the mail system. Implement `toMail()` |
| `database` | Stores in the `notifications` table. Implement `toDatabase()` |
| `slack` | Posts to a Slack incoming webhook. Implement `toSlack()` |
| `webhook` | POSTs JSON to a custom URL. Implement `toWebhook()` |
| `broadcast` | Pushes over Echo/WebSocket. Implement `toBroadcast()`; requires `BroadcastServiceProvider` |
| `sms` | Sends via `SmsChannel` transport stub. Implement `toSms()` |

### Slack

```typescript
override toSlack() {
  return {
    webhookUrl: process.env.SLACK_WEBHOOK_URL!,
    text: 'Order shipped!',
  };
}
```

### Webhook

```typescript
override toWebhook() {
  return {
    url: 'https://example.com/hooks/orders',
    body: { event: 'order.shipped', id: 42 },
  };
}
```

### Broadcast

```typescript
override toBroadcast(notifiable: Notifiable) {
  return {
    event: 'NotificationSent',
    channels: [`App.Models.User.${notifiable.getKey()}`],
    data: { type: 'OrderShipped' },
  };
}
```

### SMS (Twilio-compatible stub)

Register a transport during boot (the default logs to stdout):

```typescript
import { setSmsTransport } from '@pondoknusa/notifications';

setSmsTransport(async (message) => {
  // Twilio example:
  // await twilioClient.messages.create({ to: message.to, from: message.from, body: message.body });
  console.log(`[sms] ${message.to}: ${message.body}`);
});
```

Notification + notifiable:

```typescript
export class LoginCodeNotification extends Notification {
  override via(): Array<'sms'> {
    return ['sms'];
  }

  override toSms(notifiable: Notifiable) {
    return {
      to: notifiable.routeNotificationForSms!(),
      body: `Your code is ${this.code}`,
    };
  }
}
```

See `examples/hello-world/src/notifications/login-code-notification.ts` for a working scaffold.

## Batching and digests

Send multiple notifications in one pass:

```typescript
import { NotificationBatch } from '@pondoknusa/notifications';

const batch = new NotificationBatch();
batch.add(user, new CommentNotification(post));
batch.add(user, new LikeNotification(post));

await batch.sendNow(manager);       // two separate deliveries
await batch.sendDigestNow(manager); // one combined digest per notifiable
```

`NotificationDigest` groups by notifiable and wraps multiple items in a `DigestNotification` that merges `toMail()`, `toSlack()`, `toSms()`, and `toDatabase()` payloads.

## Database inbox helpers

For in-app notification bells:

```typescript
import { DatabaseNotificationInbox } from '@pondoknusa/notifications';

const inbox = new DatabaseNotificationInbox({ connection });

const page = await inbox.paginate(user, 1, 15);
const unread = await inbox.unread(user);
const count = await inbox.unreadCount(user);

await inbox.markAsRead(notificationId);
await inbox.markAsUnread(notificationId);
await inbox.markAllAsRead(user);
```

## Queued notifications

Extend `ShouldQueue` or override `shouldQueue()` to deliver notifications via the queue:

```typescript
import { Notification, ShouldQueue } from '@pondoknusa/notifications';

export class WelcomeNotification extends Notification implements ShouldQueue {
  override shouldQueue(): boolean {
    return true;
  }

  connection = 'database';
  queue = 'notifications';
  delaySeconds = 10;
}
```

## Failed notifications

Failed queued notifications land in `failed_jobs`. Inspect and retry them:

```bash
pondoknusa notification:failed
pondoknusa notification:retry <id>
```

## Notifiable type

The `Notifiable` interface requires at minimum:

```typescript
interface Notifiable {
  getKey(): string | number;
  routeNotificationForMail?(): string | { address: string; name?: string };
  routeNotificationForSms?(): string;
}
```

## Testing fakes

```typescript
import { mailFake, notificationFake } from '@pondoknusa/testing';

const mail = mailFake(app);
const notifications = notificationFake(app);

await Notifications.send(user, new WelcomeNotification(user));

notifications.assertSent((entry) => entry.notification.id() === 'WelcomeNotification');
mail.assertNothingSent();
```

## Service provider registration

```typescript
import { NotificationServiceProvider } from '@pondoknusa/core';

app.register(NotificationServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setNotificationApplication } from '@pondoknusa/core';

setNotificationApplication(app);
```