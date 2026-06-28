import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';
import { Auth, Password } from '@tyravel/core';
import type { Application } from '@tyravel/core';
import { OAuthManager } from '@tyravel/auth';

export class AuthController {
  constructor(private readonly app: Application) {}

  async login(request: TyravelRequest) {
    const body = await request.json<{ email?: string; password?: string }>();
    await Auth.attempt({
      email: body.email ?? '',
      password: body.password ?? '',
    });

    return Response.json({
      user: {
        id: Auth.id(),
      },
    });
  }

  async logout(_request: TyravelRequest) {
    await Auth.logout();
    return Response.json({ message: 'Logged out.' });
  }

  me(request: TyravelRequest) {
    return Response.json({
      user: request.user,
    });
  }

  async forgotPassword(request: TyravelRequest) {
    const body = await request.json<{ email?: string }>();
    await Password.sendResetLink(body.email ?? '');
    return Response.json({
      message: 'If that email exists, a reset link has been sent.',
    });
  }

  async resetPassword(request: TyravelRequest) {
    const body = await request.json<{
      email?: string;
      token?: string;
      password?: string;
    }>();
    await Password.reset({
      email: body.email ?? '',
      token: body.token ?? '',
      password: body.password ?? '',
    });
    return Response.json({ message: 'Password has been reset.' });
  }

  async createToken(request: TyravelRequest) {
    const body = await request.json<{
      name?: string;
      abilities?: string[];
      expiresIn?: string;
      ipWhitelist?: string[];
    }>();
    const token = await Auth.createToken(body.name ?? 'api', body.abilities, {
      expiresIn: body.expiresIn,
      ipWhitelist: body.ipWhitelist,
    });
    return Response.json({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      plainTextToken: token.plainTextToken,
      abilities: token.abilities,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    });
  }

  async revokeToken(request: TyravelRequest) {
    const tokenId = Number(request.param('id'));
    const revoked = await Auth.revokeToken(tokenId);
    if (!revoked) {
      return Response.json({ message: 'Token not found.' }, { status: 404 });
    }
    return Response.json({ message: 'Token revoked.' });
  }

  oauthRedirect(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const state = oauth.createState();
    request.session?.put(`oauth.${provider}.state`, state);

    const authorize: { codeChallenge?: string; codeChallengeMethod?: 'S256' } = {};
    if (oauth.driverUsesPkce(provider)) {
      const pkce = oauth.createPkcePair();
      request.session?.put(`oauth.${provider}.pkce_verifier`, pkce.verifier);
      authorize.codeChallenge = pkce.challenge;
      authorize.codeChallengeMethod = pkce.method;
    }

    const url = oauth.redirectUrl(provider, state, authorize);
    return Response.redirect(url, 302);
  }

  async oauthCallback(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const url = new URL(request.url);
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const expected = request.session?.get<string>(`oauth.${provider}.state`);
    if (!expected || expected !== state) {
      return Response.json({ message: 'Invalid OAuth state.' }, { status: 422 });
    }

    const codeVerifier = request.session?.get<string>(`oauth.${provider}.pkce_verifier`);
    const profile = await oauth.handleCallback(provider, code, { codeVerifier });
    const user = await oauth.findOrCreateUser(provider, profile);
    await Auth.login(user);
    return Response.redirect('/', 302);
  }
}
