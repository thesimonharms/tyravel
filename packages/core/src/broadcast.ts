import type {
  BroadcastDispatcher,
  BroadcastManager,
  ChannelAuthorizer,
  ChannelRegistry,
} from '@pondoknusa/broadcasting';
import type { Event } from '@pondoknusa/events';
import type { Application } from './application.js';

let broadcastApplication: Application | undefined;

export function setBroadcastApplication(app: Application): void {
  broadcastApplication = app;
}

function resolveManager(): BroadcastManager {
  if (!broadcastApplication) {
    throw new Error('Broadcast facade is not ready. Boot the application first.');
  }
  return broadcastApplication.make<BroadcastManager>('broadcasting');
}

function resolveDispatcher(): BroadcastDispatcher {
  if (!broadcastApplication) {
    throw new Error('Broadcast facade is not ready. Boot the application first.');
  }
  return broadcastApplication.make<BroadcastDispatcher>('broadcasting.dispatcher');
}

function resolveChannels(): ChannelRegistry {
  if (!broadcastApplication) {
    throw new Error('Broadcast facade is not ready. Boot the application first.');
  }
  return broadcastApplication.make<ChannelRegistry>('broadcasting.channels');
}

export interface BroadcastFacade {
  connection(name?: string): ReturnType<BroadcastManager['connection']>;
  dispatch(event: Event): Promise<void>;
  channel(pattern: string, authorizer: ChannelAuthorizer): void;
}

export const Broadcast: BroadcastFacade = {
  connection: (name) => resolveManager().connection(name),
  dispatch: (event) => resolveDispatcher().dispatch(event),
  channel: (pattern, authorizer) => {
    resolveChannels().register(pattern, authorizer);
  },
};