import { describe, expect, it } from 'vitest';
import {
  DiscordOAuthDriver,
  GithubOAuthDriver,
  GoogleOAuthDriver,
  MicrosoftOAuthDriver,
} from './oauth.js';

const config = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'http://localhost/callback',
};

describe('OAuth drivers', () => {
  it('builds GitHub authorize URL with state', () => {
    const driver = new GithubOAuthDriver({
      ...config,
      scopes: ['user:email'],
    });

    const url = new URL(driver.authorizationUrl('state-123'));
    expect(url.hostname).toBe('github.com');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('state-123');
  });

  it('builds Google authorize URL with state', () => {
    const url = new URL(new GoogleOAuthDriver(config).authorizationUrl('state-456'));
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('state')).toBe('state-456');
  });

  it('builds Discord authorize URL with state', () => {
    const url = new URL(new DiscordOAuthDriver(config).authorizationUrl('state-789'));
    expect(url.hostname).toBe('discord.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-789');
  });

  it('builds Microsoft authorize URL with state', () => {
    const url = new URL(new MicrosoftOAuthDriver(config).authorizationUrl('state-101'));
    expect(url.hostname).toBe('login.microsoftonline.com');
    expect(url.searchParams.get('state')).toBe('state-101');
  });
});