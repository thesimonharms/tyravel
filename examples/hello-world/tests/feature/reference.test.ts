import { describe, expect, it } from 'vitest';
import { withTyravelTest } from '@tyravel/testing';
import { ArrayMailTransport, MailManager } from '@tyravel/mail';
import { ReferenceTestCase } from '../support/reference-test-case.js';

const t = withTyravelTest(ReferenceTestCase);

describe('hello-world reference app', () => {
  it('renders the welcome page', async () => {
    const response = await t.http.get('http://localhost/');
    await response.assertOk();
    const html = await response.text();
    expect(html).toContain('Hello Tyravel');
  });

  it('registers a user and sends a welcome email', async () => {
    const response = await t.http.post('http://localhost/register', {
      json: {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secret',
      },
    });

    await response.assertOk().assertJson({
      user: { email: 'ada@example.com' },
    });

    const mail = t.app.make(MailManager);
    const transport = mail.transport('array') as ArrayMailTransport;
    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.subject).toBe('Welcome to Tyravel');
    expect(transport.messages[0]?.to[0]?.address).toBe('ada@example.com');
    expect(transport.messages[0]?.text).toContain('Ada');
  });

  it('authenticates with session after login', async () => {
    await t.http.post('http://localhost/register', {
      json: {
        name: 'Grace',
        email: 'grace@example.com',
        password: 'secret',
      },
    });

    await t.http.post('http://localhost/logout');
    t.http.resetCookies();

    const login = await t.http.post('http://localhost/login', {
      json: { email: 'grace@example.com', password: 'secret' },
    });
    await login.assertOk();

    const me = await t.http.get('http://localhost/me');
    await me.assertOk();
    await me.assertJsonPath('user.email', 'grace@example.com');
  });
});