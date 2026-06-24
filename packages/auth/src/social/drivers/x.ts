import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class XOAuthDriver implements SocialOAuthDriver {
  readonly name = 'x';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['users.read', 'tweet.read', 'offline.access']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    if (!context?.codeVerifier) {
      throw new Error('X OAuth requires a PKCE code verifier.');
    }

    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context.codeVerifier,
    });

    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const payload = (await userRes.json()) as {
      data?: {
        id: string;
        name?: string;
        username?: string;
        profile_image_url?: string;
      };
    };

    const user = payload.data;
    if (!user) {
      throw new Error('X OAuth user lookup failed.');
    }

    return {
      id: user.id,
      email: null,
      name: user.name ?? user.username ?? null,
      avatar: user.profile_image_url ?? null,
    };
  }
}