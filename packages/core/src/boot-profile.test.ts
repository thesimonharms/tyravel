import { ConfigRepository } from '@tyravel/config';
import { describe, expect, it } from 'vitest';
import { Application } from './application.js';
import {
  applyBootProfile,
  HEADLESS_BINDING,
  isHeadlessApplication,
  shouldRegisterViewStack,
} from './boot-profile.js';

describe('boot profile', () => {
  it('marks headless applications from config', async () => {
    const app = new Application('/tmp/app');
    const config = new ConfigRepository({ app: { headless: true } });
    app.instance('config', config);

    const headless = await applyBootProfile(app, config);
    expect(headless).toBe(true);
    expect(isHeadlessApplication(app)).toBe(true);
    expect(app.make<boolean>(HEADLESS_BINDING)).toBe(true);
  });

  it('skips view stack when headless', () => {
    expect(shouldRegisterViewStack(true)).toBe(false);
    expect(shouldRegisterViewStack(false)).toBe(true);
  });
});