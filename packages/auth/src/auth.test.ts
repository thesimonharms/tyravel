import { describe, expect, it } from 'vitest';
import { TyravelRequest } from '@tyravel/http';
import { Hasher } from './hasher.js';
import { MemorySessionStore, SessionGuard } from './index.js';
import type { Authenticatable, AuthConfig } from './types.js';
import type { UserProvider } from './user-provider.js';

class StubUser implements Authenticatable {
  constructor(
    private readonly id: number,
    private readonly passwordHash: string,
  ) {}

  getAuthIdentifier(): number {
    return this.id;
  }

  getAuthPassword(): string {
    return this.passwordHash;
  }
}

class StubProvider implements UserProvider {
  constructor(private readonly hasher: Hasher) {}

  async retrieveById(id: string | number): Promise<Authenticatable | null> {
    if (Number(id) === 1) {
      return new StubUser(1, this.hasher.make('secret'));
    }
    return null;
  }

  async retrieveByCredentials(
    credentials: Record<string, string>,
  ): Promise<Authenticatable | null> {
    if (credentials.email === 'a@b.c') {
      return new StubUser(1, this.hasher.make('secret'));
    }
    return null;
  }

  async validateCredentials(
    user: Authenticatable,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    return this.hasher.check(credentials.password ?? '', user.getAuthPassword());
  }
}

describe('SessionGuard', () => {
  const config: AuthConfig['session'] = {
    cookie: 'tyravel_session',
    lifetimeMinutes: 120,
    table: 'sessions',
  };

  it('logs in and sets session cookie', async () => {
    const hasher = new Hasher();
    const guard = new SessionGuard(
      'web',
      new StubProvider(hasher),
      new MemorySessionStore(),
      config,
    );
    const request = new TyravelRequest(
      new Request('http://localhost/login', { method: 'POST' }),
    );
    guard.setRequest(request);
    await guard.startSession();

    await guard.attempt({ email: 'a@b.c', password: 'secret' });
    expect(guard.check()).toBe(true);
    expect(guard.id()).toBe(1);

    const response = await guard.persistSession(
      new globalThis.Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    expect(response.headers.get('set-cookie')).toContain('tyravel_session=');
  });

  it('adds Secure when configured', async () => {
    const hasher = new Hasher();
    const guard = new SessionGuard(
      'web',
      new StubProvider(hasher),
      new MemorySessionStore(),
      {
        ...config,
        secure: true,
        sameSite: 'Strict',
      },
    );
    const request = new TyravelRequest(
      new Request('http://localhost/login', { method: 'POST' }),
    );
    guard.setRequest(request);
    await guard.startSession();
    await guard.attempt({ email: 'a@b.c', password: 'secret' });

    const response = await guard.persistSession(new globalThis.Response('ok', { status: 200 }));
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
  });
});

describe('Hasher', () => {
  it('hashes and verifies passwords', () => {
    const hasher = new Hasher();
    const hash = hasher.make('password');
    expect(hasher.check('password', hash)).toBe(true);
    expect(hasher.check('wrong', hash)).toBe(false);
  });
});