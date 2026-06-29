import type { Application } from './application.js';
import type { Gate as AuthorizationGate } from '@pondoknusa/auth';
import type { Authenticatable } from '@pondoknusa/auth';

let gateApplication: Application | undefined;

export function setGateApplication(app: Application): void {
  gateApplication = app;
}

function resolveGate(): AuthorizationGate {
  if (!gateApplication) {
    throw new Error('Gate facade requires setGateApplication(app) during bootstrap.');
  }
  return gateApplication.make<AuthorizationGate>('gate');
}

export interface GateFacade {
  allows(user: Authenticatable | null, ability: string, model?: unknown): Promise<boolean>;
  authorize(user: Authenticatable | null, ability: string, model?: unknown): Promise<void>;
  denyUnless(user: Authenticatable | null, ability: string, model?: unknown): Promise<void>;
}

export const Gate: GateFacade = {
  allows: (user, ability, model) => resolveGate().allows(user, ability, model),
  authorize: (user, ability, model) => resolveGate().authorize(user, ability, model),
  denyUnless: (user, ability, model) => resolveGate().denyUnless(user, ability, model),
};