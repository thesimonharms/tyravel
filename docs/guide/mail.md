# Mail

Register `MailServiceProvider` and add `config/mail.ts`:

```typescript
export default {
  default: 'log',
  from: { address: 'hello@example.com', name: 'Pondoknusa' },
  connections: {
    log: { driver: 'log', channel: 'stdout' },
    array: { driver: 'array' },
    smtp: {
      driver: 'smtp',
      host: env('SMTP_HOST', '127.0.0.1'),
      port: Number(env('SMTP_PORT', 1025)),
      username: env('SMTP_USERNAME', ''),
      password: env('SMTP_PASSWORD', ''),
      encryption: env('SMTP_ENCRYPTION', ''),
    },
  },
} as const;
```

## Sending mail

Use the `Mail` facade:

```typescript
import { Mail } from '@pondoknusa/core';

// Quick message
await Mail.to('ada@example.com').send({
  subject: 'Welcome!',
  html: '<h1>Welcome aboard</h1>',
  text: 'Welcome aboard',
});
```

## Mailable classes

For reusable mail logic, extend `Mailable`:

```typescript
import { Mailable, type MailMessage } from '@pondoknusa/mail';

export class WelcomeMail extends Mailable {
  constructor(private readonly name: string) {
    super();
  }

  override build(): MailMessage {
    return {
      subject: `Welcome, ${this.name}!`,
      htmlView: 'emails.welcome',
      textView: 'emails.welcome-text',
      viewData: { name: this.name },
    };
  }

  // Queue this mailable instead of sending immediately
  override shouldQueue(): boolean {
    return true;
  }

  connection = 'database';
  queue = 'emails';
}
```

Send it:

```typescript
await Mail.to('ada@example.com').send(new WelcomeMail('Ada'));
```

### Using `.tyr` views

When you register a `ViewServiceProvider` and set the view engine, mailable's `htmlView` and `textView` are resolved from `resources/views/`:

```
resources/views/emails/welcome.tyr
resources/views/emails/welcome-text.tyr
```

The mail package ships with default HTML and text message layouts at `@pondoknusa/mail` namespace — use them in your views:

```html
@layout('mail::html.message')

@section('body')
  <h1>Hello {{ name }}</h1>
  <p>Welcome to the app!</p>
@endsection
```

## Transports

| Driver | Description |
|--------|-------------|
| `smtp` | Send over SMTP (production) |
| `log` | Write to a log channel (development) |
| `array` | Collect messages in memory (testing) |

### Queued mail

Mark a mailable as queued by overriding `shouldQueue()` to return `true`. The mail manager will dispatch it through the queue system instead of sending immediately. Configure which queue connection to use:

```typescript
export class WelcomeMail extends Mailable {
  override shouldQueue(): boolean {
    return true;
  }
  connection = 'database'; // queue connection from config/queue.ts
  queue = 'emails';
  delaySeconds = 30; // send 30 seconds from now
}
```

## Service provider registration

```typescript
import { MailServiceProvider } from '@pondoknusa/core';

app.register(MailServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setMailApplication } from '@pondoknusa/core';

setMailApplication(app);
```

If you use mail views, also set the view engine:

```typescript
const mail = app.make<MailManager>('mail');
mail.setViewEngine(app.make<ViewEngine>('view.engine'));
```