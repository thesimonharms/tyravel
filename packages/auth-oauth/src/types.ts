export type OAuthGrantType =
  | 'authorization_code'
  | 'client_credentials'
  | 'refresh_token';

export interface OAuthTokenSigningConfig {
  enabled?: boolean;
  algorithm?:
    | 'ml-dsa-44'
    | 'ml-dsa-65'
    | 'ml-dsa-87'
    | 'slh-dsa-sha2-128f'
    | 'slh-dsa-sha2-128s'
    | 'slh-dsa-sha2-192f'
    | 'slh-dsa-sha2-192s'
    | 'slh-dsa-sha2-256f'
    | 'slh-dsa-sha2-256s';
  publicKey?: string;
  secretKey?: string;
  preferNative?: boolean;
}

export interface OAuthServerConfig {
  connection?: string;
  clientsTable?: string;
  codesTable?: string;
  accessTokensTable?: string;
  refreshTokensTable?: string;
  authorizationCodeTtlMinutes?: number;
  accessTokenTtlMinutes?: number;
  refreshTokenTtlDays?: number;
  tokenPrefix?: string;
  tokenSigning?: OAuthTokenSigningConfig;
}

export interface OAuthClientRecord {
  id: number;
  client_id: string;
  name: string;
  secret: string | null;
  redirect_uris: string;
  grants: string;
  scopes: string;
  revoked: number;
  created_at: number;
  [key: string]: unknown;
}

export interface CreateOAuthClientInput {
  name: string;
  redirectUris: string[];
  grants?: OAuthGrantType[];
  scopes?: string[];
  confidential?: boolean;
}

export interface CreatedOAuthClient {
  id: number;
  clientId: string;
  clientSecret: string | null;
  name: string;
  redirectUris: string[];
  grants: OAuthGrantType[];
  scopes: string[];
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface ResolvedOAuthAccessToken {
  id: number;
  clientId: string;
  userId: number | null;
  scopes: string[];
}

export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}

export interface TokenRequest {
  grantType: OAuthGrantType;
  clientId: string;
  clientSecret?: string;
  code?: string;
  redirectUri?: string;
  codeVerifier?: string;
  refreshToken?: string;
  scope?: string;
}