import type { Application } from './application.js';
import type { PasswordResetBroker } from '@pondoknusa/auth';

let passwordApplication: Application | undefined;

export function setPasswordApplication(app: Application): void {
  passwordApplication = app;
}

function resolveBroker(): PasswordResetBroker {
  if (!passwordApplication) {
    throw new Error('Password facade requires setPasswordApplication(app) during bootstrap.');
  }
  return passwordApplication.make<PasswordResetBroker>('auth.password');
}

export interface PasswordFacade {
  sendResetLink(email: string): Promise<string>;
  reset(input: { email: string; token: string; password: string }): Promise<void>;
}

export const Password: PasswordFacade = {
  sendResetLink: (email) => resolveBroker().sendResetLink(email),
  reset: (input) => resolveBroker().reset(input),
};