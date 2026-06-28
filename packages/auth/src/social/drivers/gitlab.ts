import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class GitlabOAuthDriver implements SocialOAuthDriver {
  readonly name = 'gitlab';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['read_user']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://gitlab.com/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://gitlab.com/oauth/token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch('https://gitlab.com/api/v4/user', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const user = (await userRes.json()) as {
      id: number;
      email?: string | null;
      name?: string | null;
      username?: string;
      avatar_url?: string | null;
    };

    return {
      id: String(user.id),
      email: user.email ?? null,
      name: user.name ?? user.username ?? null,
      avatar: user.avatar_url ?? null,
    };
  }
}