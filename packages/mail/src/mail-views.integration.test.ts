import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ArrayMailTransport, MailManager } from './index.js';
import { MAIL_VIEWS_PATH } from './views-path.js';
import { ViewEngine } from '@tyravel/views';

describe('mail package views', () => {
  it('renders namespaced mail layouts through MailManager', async () => {
    const basePath = join(tmpdir(), `tyravel-mail-ns-${Date.now()}`);
    mkdirSync(basePath, { recursive: true });

    const engine = new ViewEngine(basePath, { path: 'resources/views' });
    engine.namespace('mail', MAIL_VIEWS_PATH);

    const manager = new MailManager({
      default: 'array',
      from: { address: 'app@example.com' },
      connections: { array: { driver: 'array' } },
    });
    manager.setViewEngine(engine);

    await manager.mailer().to('user@example.com').send({
      subject: 'Welcome',
      to: [],
      htmlView: 'mail::html.message',
      textView: 'mail::text.message',
      viewData: {
        subject: 'Welcome',
        body: 'Hello from Tyravel mail',
      },
    });

    const transport = manager.transport('array') as ArrayMailTransport;
    expect(transport.messages[0]?.html).toContain('Hello from Tyravel mail');
    expect(transport.messages[0]?.text).toContain('Hello from Tyravel mail');
  });
});