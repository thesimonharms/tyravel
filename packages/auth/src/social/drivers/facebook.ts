import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class FacebookOAuthDriver implements SocialOAuthDriver {
  readonly name = 'facebook';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['email', 'public_profile']).join(','),
      state,
    });
    appendPkceParams(params, context);
    return `https://www.facebook.com/v20.0/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`,
    );

    const user = (await userRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: { data?: { url?: string } };
    };

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      avatar: user.picture?.data?.url ?? null,
    };
  }
}