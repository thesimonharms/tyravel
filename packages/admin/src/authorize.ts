import type { AuthManager, Gate } from '@pondoknusa/auth';
import type { ModelStatic } from '@pondoknusa/database';
import { AuthorizationException } from '@pondoknusa/auth';
import type { AdminResource } from './admin-resource.js';

export async function authorizeAdminAccess(
  gate: Gate,
  auth: AuthManager,
  ability: string,
  policyModel?: ModelStatic,
): Promise<void> {
  const user = auth.user();
  if (!policyModel) {
    throw new AuthorizationException('Admin access policy model is not configured.');
  }

  const allowed = await gate.allows(user, ability, policyModel);
  if (!allowed) {
    throw new AuthorizationException();
  }
}

export async function authorizeResourceAbility(
  gate: Gate,
  auth: AuthManager,
  resource: AdminResource,
  ability: string,
  record?: unknown,
): Promise<void> {
  if (!resource.policy) {
    return;
  }

  const user = auth.user();
  const target = record ?? resource.model;
  const allowed = await gate.allows(user, ability, target);
  if (!allowed) {
    throw new AuthorizationException();
  }
}