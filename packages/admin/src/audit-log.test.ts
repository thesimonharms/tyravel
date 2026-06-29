import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { AdminAuditLogger } from './audit-log.js';

describe('AdminAuditLogger', () => {
  it('records and retrieves resource audit entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pondoknusa-admin-audit-'));
    const logger = new AdminAuditLogger({
      persistPath: join(dir, 'audit.json'),
      maxEntries: 10,
    });

    await logger.record({
      resourceKey: 'users',
      recordId: 1,
      action: 'update',
      actorLabel: 'ada@example.com',
      changes: { name: { before: 'Ada', after: 'Grace' } },
    });

    const entries = logger.forRecord('users', 1);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('update');
  });
});