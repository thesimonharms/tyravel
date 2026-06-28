import { AppleOAuthDriver } from './drivers/apple.js';
import { BitbucketOAuthDriver } from './drivers/bitbucket.js';
import { DiscordOAuthDriver } from './drivers/discord.js';
import { FacebookOAuthDriver } from './drivers/facebook.js';
import { GithubOAuthDriver } from './drivers/github.js';
import { GitlabOAuthDriver } from './drivers/gitlab.js';
import { GoogleOAuthDriver } from './drivers/google.js';
import { LinkedInOAuthDriver } from './drivers/linkedin.js';
import { MicrosoftOAuthDriver } from './drivers/microsoft.js';
import { SlackOAuthDriver } from './drivers/slack.js';
import { SpotifyOAuthDriver } from './drivers/spotify.js';
import { TwitchOAuthDriver } from './drivers/twitch.js';
import { XOAuthDriver } from './drivers/x.js';
import type { SocialOAuthDriverConstructor } from './types.js';

export const BUILTIN_SOCIAL_OAUTH_DRIVERS: Record<string, SocialOAuthDriverConstructor> = {
  github: GithubOAuthDriver,
  google: GoogleOAuthDriver,
  discord: DiscordOAuthDriver,
  microsoft: MicrosoftOAuthDriver,
  x: XOAuthDriver,
  twitter: XOAuthDriver,
  facebook: FacebookOAuthDriver,
  linkedin: LinkedInOAuthDriver,
  apple: AppleOAuthDriver,
  gitlab: GitlabOAuthDriver,
  slack: SlackOAuthDriver,
  spotify: SpotifyOAuthDriver,
  twitch: TwitchOAuthDriver,
  bitbucket: BitbucketOAuthDriver,
};

export {
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
};