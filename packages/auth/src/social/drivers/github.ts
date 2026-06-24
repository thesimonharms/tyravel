import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class GithubOAuthDriver implements SocialOAuthDriver {
  readonly name = 'github';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: (this.config.scopes ?? ['user:email']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
      headers: { accept: 'application/json' },
    });

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
        'user-agent': 'tyravel-auth',
      },
    });

    const user = (await userRes.json()) as {
      id: number;
      login?: string;
      email?: string | null;
      name?: string | null;
      avatar_url?: string | null;
    };

    return {
      id: String(user.id),
      email: user.email ?? null,
      name: user.name ?? user.login ?? null,
      avatar: user.avatar_url ?? null,
    };
  }
}