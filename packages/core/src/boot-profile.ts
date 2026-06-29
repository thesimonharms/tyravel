import type { ConfigRepository } from '@pondoknusa/config';
import type { Application } from './application.js';
import { BroadcastServiceProvider } from './broadcast-service-provider.js';
import { isHeadlessMode, resolveHeadlessMode } from './headless-mode.js';
import { LocaleServiceProvider } from './locale-service-provider.js';
import { ViewServiceProvider } from './view-service-provider.js';

export const HEADLESS_BINDING = 'pondoknusa.headless';

export async function applyBootProfile(
  app: Application,
  config?: ConfigRepository,
): Promise<boolean> {
  const headless = await resolveHeadlessMode(app.basePath, config);
  app.instance(HEADLESS_BINDING, headless);
  return headless;
}

export function isHeadlessApplication(app: Application): boolean {
  try {
    return app.make<boolean>(HEADLESS_BINDING);
  } catch {
    try {
      return isHeadlessMode(app.make<ConfigRepository>('config'));
    } catch {
      return false;
    }
  }
}

export function shouldRegisterViewStack(headless: boolean): boolean {
  return !headless;
}

export function registerViewStack(app: Application): void {
  app.register(LocaleServiceProvider);
  app.register(BroadcastServiceProvider);
  app.register(ViewServiceProvider);
}