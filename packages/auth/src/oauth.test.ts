import { describe, expect, it } from 'vitest';
import { GithubOAuthDriver } from './oauth.js';

describe('OAuth drivers', () => {
  it('builds GitHub authorize URL with state', () => {
    const driver = new GithubOAuthDriver({
      clientId: 'cid',
      clientSecret: 'secret',
      redirectUri: 'http://localhost/callback',
      scopes: ['user:email'],
    });

    const url = new URL(driver.authorizationUrl('state-123'));
    expect(url.hostname).toBe('github.com');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('state-123');
  });
});