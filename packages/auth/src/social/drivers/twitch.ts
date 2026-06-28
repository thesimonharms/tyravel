import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class TwitchOAuthDriver implements SocialOAuthDriver {
  readonly name = 'twitch';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['user:read:email']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://id.twitch.tv/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://id.twitch.tv/oauth2/token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        authorization: `Bearer ${accessToken}`,
        'client-id': this.config.clientId,
      },
    });

    const payload = (await userRes.json()) as {
      data?: Array<{
        id: string;
        email?: string;
        display_name?: string;
        profile_image_url?: string;
      }>;
    };

    const user = payload.data?.[0];
    if (!user) {
      throw new Error('Twitch user info missing');
    }

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.display_name ?? null,
      avatar: user.profile_image_url ?? null,
    };
  }
}