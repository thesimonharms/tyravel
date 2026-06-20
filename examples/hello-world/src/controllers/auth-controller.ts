import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';
import { Auth, Password, fire } from '@tyravel/core';
import type { Application } from '@tyravel/core';
import { Hasher, OAuthManager } from '@tyravel/auth';
import { User } from '../models/user.js';
import { UserRegistered } from '../events/user-registered.js';

export class AuthController {
  private readonly hasher = new Hasher();

  constructor(private readonly app: Application) {}

  async register(request: TyravelRequest) {
    const body = await request.json<{
      name?: string;
      email?: string;
      password?: string;
    }>();

    const now = new Date().toISOString();
    const user = await User.create({
      name: body.name ?? '',
      email: body.email ?? '',
      password: this.hasher.make(body.password ?? ''),
      created_at: now,
      updated_at: now,
    });

    await Auth.login(user);

    await fire(
      new UserRegistered({
        userId: user.getAuthIdentifier(),
        name: String(user.getAttribute('name')),
        email: String(user.getAttribute('email')),
      }),
    );

    return Response.json({
      user: {
        id: Auth.id(),
        email: user.getAttribute('email'),
      },
    });
  }

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
    const token = await Password.sendResetLink(body.email ?? '');
    return Response.json({
      message: 'Password reset link generated.',
      token,
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
    const body = await request.json<{ name?: string; abilities?: string[] }>();
    const token = await Auth.createToken(body.name ?? 'api', body.abilities);
    return Response.json({
      name: token.name,
      plainTextToken: token.plainTextToken,
      abilities: token.abilities,
    });
  }

  oauthRedirect(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const state = oauth.createState();
    request.session?.put(`oauth.${provider}.state`, state);
    const url = oauth.redirectUrl(provider, state);
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

    const profile = await oauth.handleCallback(provider, code, state);
    const user = await oauth.findOrCreateUser(provider, profile);
    await Auth.login(user);
    return Response.redirect('/', 302);
  }
}