import type { OAuthProviderConfig } from '../../types.js';
import type { OAuthUserProfile } from '../../oauth-types.js';
import type { OAuthAuthorizeContext, OAuthExchangeContext, SocialOAuthDriver } from '../types.js';
import { createAppleClientSecret } from '../apple-secret.js';
import { appendPkceParams } from '../http.js';

export class AppleOAuthDriver implements SocialOAuthDriver {
  readonly name = 'apple';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: (this.config.scopes ?? ['name', 'email']).join(' '),
      state,
    });
    appendPkceParams(params, context);
    return `https://appleid.apple.com/auth/authorize?${params}`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    const clientSecret = this.resolveClientSecret();
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    if (context?.codeVerifier) {
      body.set('code_verifier', context.codeVerifier);
    }

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = (await response.json()) as { id_token?: string; error?: string };
    if (!json.id_token) {
      throw new Error(json.error ?? 'Apple OAuth token exchange failed');
    }

    return parseAppleIdToken(json.id_token);
  }

  private resolveClientSecret(): string {
    if (this.config.teamId && this.config.keyId && this.config.privateKey) {
      return createAppleClientSecret({
        teamId: this.config.teamId,
        keyId: this.config.keyId,
        clientId: this.config.clientId,
        privateKey: this.config.privateKey,
      });
    }

    return this.config.clientSecret;
  }
}

function parseAppleIdToken(idToken: string): OAuthUserProfile {
  const [, payload] = idToken.split('.');
  if (!payload) {
    throw new Error('Apple id_token payload missing.');
  }

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub: string;
    email?: string;
  };

  return {
    id: claims.sub,
    email: claims.email ?? null,
    name: null,
    avatar: null,
  };
}