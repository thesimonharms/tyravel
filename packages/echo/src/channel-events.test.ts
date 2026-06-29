import { describe, expect, expectTypeOf, it } from 'vitest';
import type { EchoEventPayload } from './channel-events.js';

declare module '@pondoknusa/echo' {
  interface EchoChannelEventMap {
    'orders.1': {
      OrderShipped: { id: number };
    };
  }
}

describe('EchoChannelEventMap', () => {
  it('infers typed payloads for known channel events', () => {
    type Payload = EchoEventPayload<'private-orders.1', 'OrderShipped'>;
    expectTypeOf<Payload>().toEqualTypeOf<{ id: number }>();
  });

  it('falls back to unknown for unmapped channels', () => {
    type Payload = EchoEventPayload<'private-chat', 'MessageSent'>;
    expectTypeOf<Payload>().toEqualTypeOf<unknown>();
  });
});