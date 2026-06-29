import type { DatabaseConnection } from '@pondoknusa/database';
import type { UserProvider } from '@pondoknusa/auth';
import { invalidClient, invalidGrant, invalidRequest, unauthorizedClient, unsupportedGrant } from './exceptions.js';
import { createOAuthRepositories } from './repositories.js';
import { parseJsonArray } from './token-utils.js';
import type {
  AuthorizationRequest,
  CreateOAuthClientInput,
  CreatedOAuthClient,
  OAuthTokenResponse,
  ResolvedOAuthAccessToken,
  TokenRequest,
} from './types.js';
import type { OAuthServerConfig } from './types.js';

export class OAuthServer {
  private readonly repos;

  constructor(
    connection: DatabaseConnection,
    private readonly config: OAuthServerConfig,
    private readonly userProvider?: UserProvider,
  ) {
    this.repos = createOAuthRepositories(connection, config);
  }

  async createClient(input: CreateOAuthClientInput): Promise<CreatedOAuthClient> {
    return this.repos.clients.create(input);
  }

  async validateAuthorizationRequest(input: AuthorizationRequest) {
    if (input.responseType !== 'code') {
      throw invalidRequest('Only response_type=code is supported.');
    }

    const client = await this.repos.clients.findByClientId(input.clientId);
    if (!client || client.revoked) {
      throw invalidClient('Unknown OAuth client.');
    }

    const redirectUris = this.repos.clients.clientRedirectUris(client);
    if (!redirectUris.includes(input.redirectUri)) {
      throw invalidRequest('Invalid redirect URI.');
    }

    const allowedScopes = this.repos.clients.clientScopes(client);
    const requestedScopes = this.parseScopes(input.scope);
    const scopes = this.intersectScopes(requestedScopes, allowedScopes);

    return {
      client,
      scopes,
      requiresPkce: Boolean(input.codeChallenge),
    };
  }

  async approveAuthorization(input: {
    userId: number;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
  }): Promise<{ code: string; redirectUri: string }> {
    const client = await this.repos.clients.findByClientId(input.clientId);
    if (!client || client.revoked) {
      throw invalidClient('Unknown OAuth client.');
    }

    if (!this.repos.clients.clientGrants(client).includes('authorization_code')) {
      throw unauthorizedClient('Client is not allowed to use the authorization code grant.');
    }

    const issued = await this.repos.codes.create({
      clientId: input.clientId,
      userId: input.userId,
      scopes: input.scopes,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
    });

    return {
      code: issued.code,
      redirectUri: input.redirectUri,
    };
  }

  buildAuthorizationRedirect(
    redirectUri: string,
    code: string,
    state?: string,
  ): string {
    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) {
      url.searchParams.set('state', state);
    }

    return url.toString();
  }

  async issueToken(request: TokenRequest): Promise<OAuthTokenResponse> {
    switch (request.grantType) {
      case 'authorization_code':
        return this.issueAuthorizationCodeGrant(request);
      case 'client_credentials':
        return this.issueClientCredentialsGrant(request);
      case 'refresh_token':
        return this.issueRefreshTokenGrant(request);
      default:
        throw unsupportedGrant(`Grant type ${request.grantType} is not supported.`);
    }
  }

  async revokeToken(token: string): Promise<boolean> {
    return this.repos.accessTokens.revokeByToken(token);
  }

  async resolveAccessToken(bearer: string): Promise<ResolvedOAuthAccessToken | null> {
    return this.repos.accessTokens.resolveBearer(bearer);
  }

  async resolveUserForToken(token: ResolvedOAuthAccessToken) {
    if (!token.userId || !this.userProvider) {
      return null;
    }

    return this.userProvider.retrieveById(token.userId);
  }

  private async issueAuthorizationCodeGrant(request: TokenRequest): Promise<OAuthTokenResponse> {
    const client = await this.repos.clients.validateClient(request.clientId, request.clientSecret);
    if (!client) {
      throw invalidClient();
    }

    if (!this.repos.clients.clientGrants(client).includes('authorization_code')) {
      throw unauthorizedClient('Client is not allowed to use the authorization code grant.');
    }

    if (!request.code || !request.redirectUri) {
      throw invalidRequest('code and redirect_uri are required.');
    }

    const consumed = await this.repos.codes.consume({
      code: request.code,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeVerifier: request.codeVerifier,
    });

    if (!consumed) {
      throw invalidGrant('Authorization code is invalid or expired.');
    }

    return this.issueAccessAndRefreshTokens({
      clientId: request.clientId,
      userId: consumed.userId,
      scopes: consumed.scopes,
      includeRefresh: this.repos.clients.clientGrants(client).includes('refresh_token'),
    });
  }

  private async issueClientCredentialsGrant(request: TokenRequest): Promise<OAuthTokenResponse> {
    const client = await this.repos.clients.validateClient(request.clientId, request.clientSecret);
    if (!client) {
      throw invalidClient();
    }

    if (!this.repos.clients.clientGrants(client).includes('client_credentials')) {
      throw unauthorizedClient('Client is not allowed to use the client credentials grant.');
    }

    const allowedScopes = this.repos.clients.clientScopes(client);
    const requestedScopes = this.parseScopes(request.scope);
    const scopes = this.intersectScopes(requestedScopes, allowedScopes);

    const issued = await this.repos.accessTokens.issue({
      clientId: request.clientId,
      userId: null,
      scopes,
    });

    return {
      access_token: issued.plainToken,
      token_type: 'Bearer',
      expires_in: issued.expiresIn,
      scope: scopes.join(' '),
    };
  }

  private async issueRefreshTokenGrant(request: TokenRequest): Promise<OAuthTokenResponse> {
    const client = await this.repos.clients.validateClient(request.clientId, request.clientSecret);
    if (!client) {
      throw invalidClient();
    }

    if (!this.repos.clients.clientGrants(client).includes('refresh_token')) {
      throw unauthorizedClient('Client is not allowed to use the refresh token grant.');
    }

    if (!request.refreshToken) {
      throw invalidRequest('refresh_token is required.');
    }

    const consumed = await this.repos.refreshTokens.consume(request.refreshToken);
    if (!consumed) {
      throw invalidGrant('Refresh token is invalid or expired.');
    }

    const previous = await this.repos.accessTokens.findById(consumed.accessTokenId);
    if (!previous || previous.revoked_at !== null) {
      throw invalidGrant('Refresh token is invalid or expired.');
    }

    if (previous.client_id !== request.clientId) {
      throw invalidGrant('Refresh token does not belong to this client.');
    }

    await this.repos.accessTokens.revokeById(previous.id);

    return this.issueAccessAndRefreshTokens({
      clientId: previous.client_id,
      userId: previous.user_id,
      scopes: parseJsonArray(previous.scopes, ['*']),
      includeRefresh: true,
    });
  }

  private async issueAccessAndRefreshTokens(input: {
    clientId: string;
    userId: number | null;
    scopes: string[];
    includeRefresh: boolean;
  }): Promise<OAuthTokenResponse> {
    const issued = await this.repos.accessTokens.issue({
      clientId: input.clientId,
      userId: input.userId,
      scopes: input.scopes,
    });

    const response: OAuthTokenResponse = {
      access_token: issued.plainToken,
      token_type: 'Bearer',
      expires_in: issued.expiresIn,
      scope: input.scopes.join(' '),
    };

    if (input.includeRefresh) {
      const refresh = await this.repos.refreshTokens.issue(issued.id);
      response.refresh_token = refresh.plainToken;
    }

    return response;
  }

  private parseScopes(raw?: string): string[] {
    if (!raw?.trim()) {
      return ['*'];
    }

    return raw.split(/\s+/).filter(Boolean);
  }

  private intersectScopes(requested: string[], allowed: string[]): string[] {
    if (allowed.includes('*')) {
      return requested;
    }

    return requested.filter((scope) => allowed.includes(scope));
  }
}