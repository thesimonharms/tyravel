import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class SpotifyOAuthDriver implements SocialOAuthDriver {
  readonly name = 'spotify';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['user-read-email', 'user-read-private']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://accounts.spotify.com/api/token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const user = (await userRes.json()) as {
      id: string;
      email?: string;
      display_name?: string | null;
      images?: Array<{ url?: string }>;
    };

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.display_name ?? null,
      avatar: user.images?.[0]?.url ?? null,
    };
  }
}