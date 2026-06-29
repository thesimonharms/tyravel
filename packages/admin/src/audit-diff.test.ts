import { describe, expect, it } from 'vitest';
import { Model } from '@pondoknusa/database';
import { buildAuditChanges } from './audit-diff.js';

describe('buildAuditChanges', () => {
  it('records only changed attributes', () => {
    const record = new Model({ name: 'Ada', email: 'ada@example.com' });
    const changes = buildAuditChanges(
      [
        { name: 'name' },
        { name: 'email' },
      ],
      record,
      { name: 'Grace', email: 'ada@example.com' },
    );

    expect(changes).toEqual({
      name: { before: 'Ada', after: 'Grace' },
    });
  });
});