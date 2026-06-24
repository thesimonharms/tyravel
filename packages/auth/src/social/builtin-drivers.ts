import { AppleOAuthDriver } from './drivers/apple.js';
import { DiscordOAuthDriver } from './drivers/discord.js';
import { FacebookOAuthDriver } from './drivers/facebook.js';
import { GithubOAuthDriver } from './drivers/github.js';
import { GoogleOAuthDriver } from './drivers/google.js';
import { LinkedInOAuthDriver } from './drivers/linkedin.js';
import { MicrosoftOAuthDriver } from './drivers/microsoft.js';
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
};

export {
  AppleOAuthDriver,
  DiscordOAuthDriver,
  FacebookOAuthDriver,
  GithubOAuthDriver,
  GoogleOAuthDriver,
  LinkedInOAuthDriver,
  MicrosoftOAuthDriver,
  XOAuthDriver,
};