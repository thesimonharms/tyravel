import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { appendPkceParams, exchangeAuthorizationCode } from '../http.js';

export class BitbucketOAuthDriver implements SocialOAuthDriver {
  readonly name = 'bitbucket';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['account', 'email']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://bitbucket.org/site/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const accessToken = await exchangeAuthorizationCode({
      tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      code,
      redirectUri: this.config.redirectUri,
      codeVerifier: context?.codeVerifier,
    });

    const userRes = await fetch('https://api.bitbucket.org/2.0/user', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const user = (await userRes.json()) as {
      uuid: string;
      display_name?: string;
      links?: { avatar?: { href?: string } };
    };

    let email: string | null = null;
    const emailRes = await fetch('https://api.bitbucket.org/2.0/user/emails', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (emailRes.ok) {
      const emails = (await emailRes.json()) as {
        values?: Array<{ email?: string; is_primary?: boolean }>;
      };
      const primary = emails.values?.find((entry) => entry.is_primary) ?? emails.values?.[0];
      email = primary?.email ?? null;
    }

    return {
      id: user.uuid,
      email,
      name: user.display_name ?? null,
      avatar: user.links?.avatar?.href ?? null,
    };
  }
}