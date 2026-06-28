import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class SlackOAuthDriver implements SocialOAuthDriver {
  readonly name = 'slack';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['openid', 'profile', 'email']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://slack.com/openid/connect/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://slack.com/api/openid.connect.token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch('https://slack.com/api/openid.connect.userInfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const user = (await userRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!user.sub) {
      throw new Error('Slack user info missing subject');
    }

    return {
      id: user.sub,
      email: user.email ?? null,
      name: user.name ?? null,
      avatar: user.picture ?? null,
    };
  }
}