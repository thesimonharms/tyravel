import type { OAuthUserProfile } from '../oauth-types.js';

export type { OAuthUserProfile };

export interface OAuthAuthorizeContext {
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}

export interface OAuthExchangeContext {
  codeVerifier?: string;
}

export interface SocialOAuthDriver {
  readonly name: string;
  readonly usesPkce?: boolean;
  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string;
  exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile>;
}

export type SocialOAuthDriverConstructor = new (
  config: import('../types.js').OAuthProviderConfig,
) => SocialOAuthDriver;