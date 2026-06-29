import { Job } from '@pondoknusa/queue';
import type { BroadcastPayload } from './types.js';

export interface BroadcastEventData extends Record<string, unknown> {
  connection: string;
  payload: BroadcastPayload;
}

export class BroadcastEvent extends Job<BroadcastEventData> {
  static broadcaster?: (connection: string, payload: BroadcastPayload) => Promise<void>;

  override async handle(): Promise<void> {
    if (!BroadcastEvent.broadcaster) {
      throw new Error('BroadcastEvent broadcaster is not configured.');
    }
    await BroadcastEvent.broadcaster(this.data.connection, this.data.payload);
  }
}