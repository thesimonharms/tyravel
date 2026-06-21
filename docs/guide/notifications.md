# Notifications

Register `NotificationServiceProvider` (which registers `MailServiceProvider` as a dependency) and add `config/notifications.ts`:

```typescript
export default {
  database: {
    table: 'notifications',
    connection: 'sqlite',
  },
} as const;
```

Run the notifications table migration:

```bash
tyravel migrate
```

## Sending notifications

Use the `Notifications` facade:

```typescript
import { Notifications } from '@tyravel/core';

await Notifications.send(user, new WelcomeNotification(user));
```

## Notification classes

Extend `Notification` and implement `via()` to declare delivery channels:

```typescript
import { Notification, type Notifiable } from '@tyravel/notifications';
import type { MailMessage } from '@tyravel/mail';

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
      user_id: notifiable.id,
    };
  }
}
```

## Channels

| Channel | Description |
|---------|-------------|
| `mail` | Sends via the mail system. Requires `MailServiceProvider`. Implement `toMail()` |
| `database` | Stores in the `notifications` table. Requires a database notification table. Implement `toDatabase()` |

Define which channels to use by returning them from `via()`:

```typescript
via(notifiable: Notifiable): string[] {
  return ['mail', 'database'];
}
```

### Notifiable type

The `Notifiable` interface requires at minimum:

```typescript
interface Notifiable {
  id: string | number;
  email?: string;
  [key: string]: unknown;
}
```

## Queued notifications

Extend `ShouldQueue` or override `shouldQueue()` to deliver notifications via the queue:

```typescript
import { Notification, ShouldQueue } from '@tyravel/notifications';

export class WelcomeNotification extends Notification implements ShouldQueue {
  override shouldQueue(): boolean {
    return true;
  }

  connection = 'database';
  queue = 'notifications';
  delaySeconds = 10;
}
```

## Notification registry

Register notification classes so the queue worker can reconstruct them:

```typescript
import { NotificationRegistry } from '@tyravel/notifications';
import { WelcomeNotification } from '../notifications/welcome-notification.js';

const registry = app.make<NotificationRegistry>('notifications.registry');
registry.register(WelcomeNotification);
```

## Service provider registration

```typescript
import { NotificationServiceProvider } from '@tyravel/core';

app.register(NotificationServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setNotificationApplication } from '@tyravel/core';

setNotificationApplication(app);
```