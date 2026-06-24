import type { TyravelRequest } from '@tyravel/http';
import type { Authenticatable, Guard } from './types.js';
import type { UserProvider } from './user-provider.js';
import { PersonalAccessTokenRepository } from './personal-access-token-repository.js';

export class TokenGuard implements Guard {
  readonly name: string;
  private request?: TyravelRequest;
  private currentUser: Authenticatable | null = null;
  private resolved = false;

  constructor(
    name: string,
    private readonly provider: UserProvider,
    private readonly tokens: PersonalAccessTokenRepository,
  ) {
    this.name = name;
  }

  setRequest(request: TyravelRequest): void {
    this.request = request;
    this.currentUser = null;
    this.resolved = false;
  }

  user(): Authenticatable | null {
    return this.currentUser;
  }

  id(): string | number | null {
    return this.currentUser?.getAuthIdentifier() ?? null;
  }

  async check(): Promise<boolean> {
    await this.resolve();
    return this.currentUser !== null;
  }

  async authenticate(): Promise<Authenticatable | null> {
    await this.resolve();
    return this.currentUser;
  }

  private async resolve(): Promise<void> {
    if (this.resolved || !this.request) {
      return;
    }

    this.resolved = true;
    const header = this.request.header('authorization');
    if (!header?.toLowerCase().startsWith('bearer ')) {
      return;
    }

    const bearer = header.slice(7).trim();
    if (!bearer) {
      return;
    }

    const resolved = await this.tokens.findUserIdByBearerToken(
      bearer,
      (id) => this.provider.retrieveById(id),
      { ip: this.request.ip() },
    );

    if (resolved) {
      this.currentUser = resolved.user;
      this.request.user = resolved.user;
      this.request.tokenAbilities = resolved.abilities;
      this.request.tokenId = resolved.id;
    }
  }
}