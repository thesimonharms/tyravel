import { describe, expect, it } from 'vitest';
import { JobRegistry } from './registry.js';
import { QueueManager } from './queue-manager.js';
import { QueueWorker } from './worker.js';

describe('QueueManager', () => {
  it('rejects sync driver connections in production', () => {
    const manager = new QueueManager(
      {
        default: 'sync',
        connections: { sync: { driver: 'sync' } },
      },
      new QueueWorker(new JobRegistry()),
    );

    expect(() => manager.connection()).toThrow('Unsupported queue driver: sync');
  });
});