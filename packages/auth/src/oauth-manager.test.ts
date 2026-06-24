import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOAuthDriversForTesting,
  OAuthManager,
  registerOAuthDriver,
  type OAuthDriver,
  type OAuthUserProfile,
} from './oauth.js';
import type { OAuthProviderConfig } from './types.js';

const config: OAuthProviderConfig = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'http://localhost/callback',
};

class CustomOAuthDriver implements OAuthDriver {
  readonly name = 'custom';

  authorizationUrl(state: string): string {
    return `https://custom.test/authorize?state=${state}`;
  }

  async exchangeCode(_code: string): Promise<OAuthUserProfile> {
    return {
      id: '1',
      email: 'user@custom.test',
      name: 'Custom User',
      avatar: null,
    };
  }
}

describe('OAuthManager driver registry', () => {
  afterEach(() => {
    clearOAuthDriversForTesting();
  });

  it('uses registered custom drivers', () => {
    registerOAuthDriver('custom', CustomOAuthDriver);
    const manager = new OAuthManager(
      { custom: config },
      {} as never,
      'oauth_accounts',
      class {} as never,
    );

    expect(manager.redirectUrl('custom', 'state-abc')).toBe(
      'https://custom.test/authorize?state=state-abc',
    );
  });
});