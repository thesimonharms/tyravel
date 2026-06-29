import type { AuthConfig } from '@pondoknusa/auth';
import { env } from '@pondoknusa/config';
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
    cookie: 'pondoknusa_session',
    lifetimeMinutes: 120,
    secure: env('SESSION_SECURE', 'false') === 'true',
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
    prefix: 'tyr_',
    prefixLength: 8,
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
      x: {
        clientId: env('X_CLIENT_ID', ''),
        clientSecret: env('X_CLIENT_SECRET', ''),
        redirectUri: env('X_REDIRECT_URI', 'http://127.0.0.1:3000/auth/x/callback'),
      },
      facebook: {
        clientId: env('FACEBOOK_CLIENT_ID', ''),
        clientSecret: env('FACEBOOK_CLIENT_SECRET', ''),
        redirectUri: env('FACEBOOK_REDIRECT_URI', 'http://127.0.0.1:3000/auth/facebook/callback'),
      },
      linkedin: {
        clientId: env('LINKEDIN_CLIENT_ID', ''),
        clientSecret: env('LINKEDIN_CLIENT_SECRET', ''),
        redirectUri: env('LINKEDIN_REDIRECT_URI', 'http://127.0.0.1:3000/auth/linkedin/callback'),
      },
      apple: {
        clientId: env('APPLE_CLIENT_ID', ''),
        clientSecret: env('APPLE_CLIENT_SECRET', ''),
        redirectUri: env('APPLE_REDIRECT_URI', 'http://127.0.0.1:3000/auth/apple/callback'),
        teamId: env('APPLE_TEAM_ID', ''),
        keyId: env('APPLE_KEY_ID', ''),
        privateKey: env('APPLE_PRIVATE_KEY', ''),
      },
    },
  },
  policies: {
    [Post.name]: PostPolicy,
  },
} satisfies AuthConfig;