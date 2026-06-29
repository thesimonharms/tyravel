import { afterEach, describe, expect, it } from 'vitest';
import { MlDsa } from '@pondoknusa/crypto';
import { QueryBuilder, SqliteConnection } from '@pondoknusa/database';
import { OAuthServer } from './oauth-server.js';

async function createServer(): Promise<{
  server: OAuthServer;
  connection: SqliteConnection;
}> {
  const connection = await SqliteConnection.connect(':memory:');
  await connection.exec(`
    CREATE TABLE oauth_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      secret TEXT,
      redirect_uris TEXT NOT NULL,
      grants TEXT NOT NULL,
      scopes TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE oauth_auth_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      scopes TEXT NOT NULL,
      code TEXT NOT NULL,
      code_challenge TEXT,
      code_challenge_method TEXT,
      redirect_uri TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER
    );
    CREATE TABLE oauth_access_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_id INTEGER,
      scopes TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER
    );
    CREATE TABLE oauth_refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER
    );
  `);

  return {
    connection,
    server: new OAuthServer(connection, {
      authorizationCodeTtlMinutes: 10,
      accessTokenTtlMinutes: 60,
      refreshTokenTtlDays: 30,
      tokenPrefix: 'oat_',
    }),
  };
}

describe('OAuthServer', () => {
  let connection: SqliteConnection | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it('issues authorization code and exchanges it for tokens', async () => {
    const setup = await createServer();
    connection = setup.connection;

    const client = await setup.server.createClient({
      name: 'Test App',
      redirectUris: ['http://localhost/callback'],
      grants: ['authorization_code', 'refresh_token'],
      scopes: ['posts:read'],
    });

    const { code } = await setup.server.approveAuthorization({
      userId: 1,
      clientId: client.clientId,
      redirectUri: 'http://localhost/callback',
      scopes: ['posts:read'],
    });

    const tokenResponse = await setup.server.issueToken({
      grantType: 'authorization_code',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
      code,
      redirectUri: 'http://localhost/callback',
    });

    expect(tokenResponse.access_token.startsWith('oat_')).toBe(true);
    expect(tokenResponse.refresh_token).toBeTruthy();

    const resolved = await setup.server.resolveAccessToken(tokenResponse.access_token);
    expect(resolved?.userId).toBe(1);
    expect(resolved?.scopes).toEqual(['posts:read']);
  });

  it('issues client credentials tokens', async () => {
    const setup = await createServer();
    connection = setup.connection;

    const client = await setup.server.createClient({
      name: 'Machine',
      redirectUris: ['http://localhost/callback'],
      grants: ['client_credentials'],
      scopes: ['*'],
    });

    const tokenResponse = await setup.server.issueToken({
      grantType: 'client_credentials',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
      scope: 'posts:read',
    });

    expect(tokenResponse.access_token.startsWith('oat_')).toBe(true);
    const resolved = await setup.server.resolveAccessToken(tokenResponse.access_token);
    expect(resolved?.userId).toBeNull();
  });

  it('refreshes access tokens', async () => {
    const setup = await createServer();
    connection = setup.connection;

    const client = await setup.server.createClient({
      name: 'Refresh App',
      redirectUris: ['http://localhost/callback'],
      grants: ['authorization_code', 'refresh_token'],
    });

    const { code } = await setup.server.approveAuthorization({
      userId: 2,
      clientId: client.clientId,
      redirectUri: 'http://localhost/callback',
      scopes: ['*'],
    });

    const initial = await setup.server.issueToken({
      grantType: 'authorization_code',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
      code,
      redirectUri: 'http://localhost/callback',
    });

    const refreshed = await setup.server.issueToken({
      grantType: 'refresh_token',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
      refreshToken: initial.refresh_token,
    });

    expect(refreshed.access_token).not.toBe(initial.access_token);
    expect(await setup.server.resolveAccessToken(initial.access_token)).toBeNull();
    expect(await setup.server.resolveAccessToken(refreshed.access_token)).not.toBeNull();
  });

  it('revokes access tokens', async () => {
    const setup = await createServer();
    connection = setup.connection;

    const client = await setup.server.createClient({
      name: 'Revoke App',
      redirectUris: ['http://localhost/callback'],
      grants: ['client_credentials'],
    });

    const tokenResponse = await setup.server.issueToken({
      grantType: 'client_credentials',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
    });

    expect(await setup.server.revokeToken(tokenResponse.access_token)).toBe(true);
    expect(await setup.server.resolveAccessToken(tokenResponse.access_token)).toBeNull();
  });

  it('issues ML-DSA signed access tokens when configured', async () => {
    const setup = await createServer();
    connection = setup.connection;
    const keys = new MlDsa('ml-dsa-65').generateKeyPair();
    const signedServer = new OAuthServer(setup.connection, {
      authorizationCodeTtlMinutes: 10,
      accessTokenTtlMinutes: 60,
      refreshTokenTtlDays: 30,
      tokenPrefix: 'oat_',
      tokenSigning: {
        enabled: true,
        algorithm: 'ml-dsa-65',
        publicKey: Buffer.from(keys.publicKey).toString('base64'),
        secretKey: Buffer.from(keys.secretKey).toString('base64'),
      },
    });

    const client = await signedServer.createClient({
      name: 'Signed App',
      redirectUris: ['http://localhost/callback'],
      grants: ['client_credentials'],
    });

    const tokenResponse = await signedServer.issueToken({
      grantType: 'client_credentials',
      clientId: client.clientId,
      clientSecret: client.clientSecret!,
    });

    expect(tokenResponse.access_token.startsWith('oat_')).toBe(true);
    expect(tokenResponse.access_token.includes('.')).toBe(true);
    const resolved = await signedServer.resolveAccessToken(tokenResponse.access_token);
    expect(resolved?.clientId).toBe(client.clientId);
    expect(await signedServer.revokeToken(tokenResponse.access_token)).toBe(true);
    expect(await signedServer.resolveAccessToken(tokenResponse.access_token)).toBeNull();
  });
});