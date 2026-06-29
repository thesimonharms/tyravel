import type { Application } from '@pondoknusa/core';
import {
  ArrayBroadcaster,
  BroadcastManager,
  type BroadcastPayload,
} from '@pondoknusa/broadcasting';

export class BroadcastFake {
  constructor(
    readonly manager: BroadcastManager,
    readonly broadcaster: ArrayBroadcaster,
  ) {}

  get payloads(): BroadcastPayload[] {
    return this.broadcaster.payloads;
  }

  assertBroadcast(predicate: (payload: BroadcastPayload) => boolean): void {
    if (!this.payloads.some(predicate)) {
      throw new Error('Expected broadcast was not dispatched.');
    }
  }

  assertNothingBroadcast(): void {
    if (this.payloads.length > 0) {
      throw new Error(`${this.payloads.length} unexpected broadcast(s) were dispatched.`);
    }
  }

  clear(): void {
    this.broadcaster.clear();
  }
}

export function broadcastFake(app: Application): BroadcastFake {
  const manager = new BroadcastManager({
    default: 'fake',
    connections: { fake: { driver: 'fake' } },
  });
  app.instance('broadcast', manager);
  const broadcaster = manager.connection('fake') as ArrayBroadcaster;
  return new BroadcastFake(manager, broadcaster);
}