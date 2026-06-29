import { Model } from '@pondoknusa/database';
import type { AdminField } from './types.js';

export function buildAuditChanges(
  fields: AdminField[],
  before: Model | Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before?: unknown; after?: unknown }> {
  const changes: Record<string, { before?: unknown; after?: unknown }> = {};

  for (const field of fields) {
    if (!(field.name in after)) {
      continue;
    }

    const previous =
      before instanceof Model
        ? before.getAttribute(field.name as never)
        : before[field.name];
    const next = after[field.name];

    if (normalizeAuditValue(previous) === normalizeAuditValue(next)) {
      continue;
    }

    changes[field.name] = {
      before: previous,
      after: next,
    };
  }

  return changes;
}

function normalizeAuditValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}