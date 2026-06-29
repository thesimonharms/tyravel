import type { Event } from '@pondoknusa/events';
import type { BroadcastPayload, ShouldBroadcast } from './types.js';

export function eventShouldBroadcast(event: Event): event is Event & ShouldBroadcast {
  return (event as unknown as ShouldBroadcast).shouldBroadcast === true;
}

export function buildBroadcastPayload(event: Event & ShouldBroadcast): BroadcastPayload {
  const channels = normalizeChannels(event.broadcastOn());
  const eventName = event.broadcastAs?.() ?? event.constructor.name;
  const data = event.broadcastWith?.() ?? (event.data as Record<string, unknown>);

  return {
    event: eventName,
    channels,
    data,
    socket: null,
  };
}

export function normalizeChannels(channels: string | string[]): string[] {
  return Array.isArray(channels) ? channels : [channels];
}