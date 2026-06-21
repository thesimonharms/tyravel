import type { AuthConfig } from '@tyravel/auth';
import { env } from '@tyravel/config';
import { Post } from '../src/models/post.js';
import { User } from '../src/models/user.js';
import { PostPolicy } from '../src/policies/post-policy.js';

export default {
  defaults: {
    guard: 'web',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },
    api: {
      driver: 'token',
      provider: 'users',
    },
  },
  providers: {
    users: {
      driver: 'eloquent',
      model: User,
    },
  },
  session: {
    driver: 'database',
    cookie: 'tyravel_session',
    lifetimeMinutes: 120,
    table: 'sessions',
    connection: 'sqlite',
  },
  passwords: {
    users: {
      provider: 'users',
      table: 'password_reset_tokens',
      expireMinutes: 60,
      connection: 'sqlite',
    },
  },
  tokens: {
    table: 'personal_access_tokens',
    connection: 'sqlite',
  },
  oauth: {
    accountsTable: 'oauth_accounts',
    connection: 'sqlite',
    providers: {
      github: {
        clientId: env('GITHUB_CLIENT_ID', ''),
        clientSecret: env('GITHUB_CLIENT_SECRET', ''),
        redirectUri: env('GITHUB_REDIRECT_URI', 'http://127.0.0.1:3000/auth/github/callback'),
        scopes: ['user:email'],
      },
      google: {
        clientId: env('GOOGLE_CLIENT_ID', ''),
        clientSecret: env('GOOGLE_CLIENT_SECRET', ''),
        redirectUri: env('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:3000/auth/google/callback'),
      },
      discord: {
        clientId: env('DISCORD_CLIENT_ID', ''),
        clientSecret: env('DISCORD_CLIENT_SECRET', ''),
        redirectUri: env('DISCORD_REDIRECT_URI', 'http://127.0.0.1:3000/auth/discord/callback'),
        scopes: ['identify', 'email'],
      },
      microsoft: {
        clientId: env('MICROSOFT_CLIENT_ID', ''),
        clientSecret: env('MICROSOFT_CLIENT_SECRET', ''),
        redirectUri: env('MICROSOFT_REDIRECT_URI', 'http://127.0.0.1:3000/auth/microsoft/callback'),
      },
    },
  },
  policies: {
    [Post.name]: PostPolicy,
  },
} satisfies AuthConfig;