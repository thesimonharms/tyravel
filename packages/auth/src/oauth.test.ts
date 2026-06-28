import { describe, expect, it } from 'vitest';
import { createPkcePair } from './social/pkce.js';
import {
  AppleOAuthDriver,
  BitbucketOAuthDriver,
  DiscordOAuthDriver,
  FacebookOAuthDriver,
  GithubOAuthDriver,
  GitlabOAuthDriver,
  GoogleOAuthDriver,
  LinkedInOAuthDriver,
  MicrosoftOAuthDriver,
  SlackOAuthDriver,
  SpotifyOAuthDriver,
  TwitchOAuthDriver,
  XOAuthDriver,
} from './social/builtin-drivers.js';

const config = {
  clientId: 'cid',
  clientSecret: 'secret',
  redirectUri: 'http://localhost/callback',
};

describe('OAuth drivers', () => {
  const pkce = createPkcePair();

  it('builds GitHub authorize URL with PKCE', () => {
    const driver = new GithubOAuthDriver({
      ...config,
      scopes: ['user:email'],
    });

    const url = new URL(
      driver.authorizationUrl('state-123', {
        codeChallenge: pkce.challenge,
        codeChallengeMethod: pkce.method,
      }),
    );
    expect(url.hostname).toBe('github.com');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code_challenge')).toBe(pkce.challenge);
  });

  it('builds Google authorize URL with PKCE', () => {
    const url = new URL(
      new GoogleOAuthDriver(config).authorizationUrl('state-456', {
        codeChallenge: pkce.challenge,
      }),
    );
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('builds Discord authorize URL with state', () => {
    const url = new URL(new DiscordOAuthDriver(config).authorizationUrl('state-789'));
    expect(url.hostname).toBe('discord.com');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('builds Microsoft authorize URL with state', () => {
    const url = new URL(new MicrosoftOAuthDriver(config).authorizationUrl('state-101'));
    expect(url.hostname).toBe('login.microsoftonline.com');
  });

  it('builds X authorize URL with PKCE', () => {
    const url = new URL(
      new XOAuthDriver(config).authorizationUrl('state-x', {
        codeChallenge: pkce.challenge,
      }),
    );
    expect(url.hostname).toBe('twitter.com');
    expect(url.searchParams.get('code_challenge')).toBe(pkce.challenge);
  });

  it('builds Facebook authorize URL', () => {
    const url = new URL(new FacebookOAuthDriver(config).authorizationUrl('state-fb'));
    expect(url.hostname).toBe('www.facebook.com');
  });

  it('builds LinkedIn authorize URL', () => {
    const url = new URL(new LinkedInOAuthDriver(config).authorizationUrl('state-li'));
    expect(url.hostname).toBe('www.linkedin.com');
  });

  it('builds Apple authorize URL', () => {
    const url = new URL(new AppleOAuthDriver(config).authorizationUrl('state-apple'));
    expect(url.hostname).toBe('appleid.apple.com');
    expect(url.searchParams.get('response_mode')).toBe('query');
  });

  it('builds GitLab authorize URL with PKCE', () => {
    const url = new URL(
      new GitlabOAuthDriver(config).authorizationUrl('state-gl', {
        codeChallenge: pkce.challenge,
      }),
    );
    expect(url.hostname).toBe('gitlab.com');
    expect(url.searchParams.get('code_challenge')).toBe(pkce.challenge);
  });

  it('builds Slack authorize URL', () => {
    const url = new URL(new SlackOAuthDriver(config).authorizationUrl('state-slack'));
    expect(url.hostname).toBe('slack.com');
    expect(url.pathname).toBe('/openid/connect/authorize');
  });

  it('builds Spotify authorize URL with PKCE', () => {
    const url = new URL(
      new SpotifyOAuthDriver(config).authorizationUrl('state-spotify', {
        codeChallenge: pkce.challenge,
      }),
    );
    expect(url.hostname).toBe('accounts.spotify.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('builds Twitch authorize URL', () => {
    const url = new URL(new TwitchOAuthDriver(config).authorizationUrl('state-twitch'));
    expect(url.hostname).toBe('id.twitch.tv');
  });

  it('builds Bitbucket authorize URL', () => {
    const url = new URL(new BitbucketOAuthDriver(config).authorizationUrl('state-bb'));
    expect(url.hostname).toBe('bitbucket.org');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});