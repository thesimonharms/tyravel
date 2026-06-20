import { randomBytes } from 'node:crypto';
import type { TyravelRequest } from '@tyravel/http';
import { InvalidCredentialsException } from './exceptions.js';
import { Session } from './session.js';
import type { SessionStore } from './session.js';
import type { UserProvider } from './user-provider.js';
import type { Authenticatable, AuthConfig, Guard } from './types.js';

type WebResponse = globalThis.Response;

function sessionKey(guard: string): string {
  return `auth.${guard}.user_id`;
}

export class SessionGuard implements Guard {
  readonly name: string;
  private session?: Session;
  private currentUser: Authenticatable | null = null;
  private request?: TyravelRequest;

  constructor(
    name: string,
    private readonly provider: UserProvider,
    private readonly store: SessionStore,
    private readonly sessionConfig: AuthConfig['session'],
  ) {
    this.name = name;
  }

  setRequest(request: TyravelRequest): void {
    this.request = request;
  }

  async startSession(): Promise<void> {
    if (!this.request) {
      throw new Error('Request not set on guard');
    }

    const cookieName = this.sessionConfig.cookie;
    const existingId = readCookie(this.request, cookieName);
    const id = existingId ?? randomBytes(32).toString('base64url');
    const data = await this.store.read(id);
    this.session = new Session(id, data);
    this.request.session = this.session;

    const userId = this.session.get<string | number>(sessionKey(this.name));
    if (userId !== undefined) {
      this.currentUser = await this.provider.retrieveById(userId);
      this.request.user = this.currentUser;
    } else if (!this.request.user) {
      this.request.user = null;
    }
  }

  async persistSession(response: WebResponse): Promise<WebResponse> {
    if (!this.session) {
      return response;
    }

    if (this.session.isDirty()) {
      await this.store.write(
        this.session.id,
        this.session.all(),
        this.sessionConfig.lifetimeMinutes,
      );
      this.session.markClean();
    }

    const cookieName = this.sessionConfig.cookie;
    const maxAge = this.sessionConfig.lifetimeMinutes * 60;
    return withCookie(response, cookieName, this.session.id, maxAge);
  }

  user(): Authenticatable | null {
    return this.currentUser;
  }

  id(): string | number | null {
    return this.currentUser?.getAuthIdentifier() ?? null;
  }

  check(): boolean {
    return this.currentUser !== null;
  }

  async attempt(credentials: Record<string, string>): Promise<boolean> {
    const user = await this.provider.retrieveByCredentials(credentials);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const valid = await this.provider.validateCredentials(user, credentials);
    if (!valid) {
      throw new InvalidCredentialsException();
    }

    await this.login(user);
    return true;
  }

  async login(user: Authenticatable): Promise<void> {
    this.currentUser = user;
    if (!this.session) {
      throw new Error('Session not started');
    }

    this.session.put(sessionKey(this.name), user.getAuthIdentifier());
    if (this.request) {
      this.request.user = user;
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    if (this.session) {
      this.session.forget(sessionKey(this.name));
    }
    if (this.request) {
      this.request.user = null;
    }
  }
}

function readCookie(request: TyravelRequest, name: string): string | undefined {
  const header = request.header('cookie');
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
}

function withCookie(
  response: WebResponse,
  name: string,
  value: string,
  maxAge: number,
): WebResponse {
  const headers = new Headers(response.headers);
  headers.append(
    'set-cookie',
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );

  return new globalThis.Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}