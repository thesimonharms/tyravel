import { createAuthTransport } from '../auth.js';
import type { EchoAuthTransport, EchoConnector, EchoListener } from '../types.js';

export interface PusherChannelLike {
  bind(event: string, listener: EchoListener): void;
  unbind(event: string, listener?: EchoListener): void;
  unsubscribe(): void;
}

export interface PusherLike {
  connection: { socket_id: string };
  subscribe(channelName: string): PusherChannelLike;
  disconnect(): void;
}

export type PusherFactory = (options: {
  key: string;
  cluster?: string;
  forceTLS?: boolean;
  authEndpoint?: string;
  authorizer: (channel: PusherChannelLike, callback: (error: Error | null, auth: string) => void) => void;
}) => PusherLike;

export interface PusherConnectorOptions {
  key: string;
  cluster?: string;
  forceTLS?: boolean;
  authEndpoint?: string;
  authTransport?: EchoAuthTransport;
  csrfToken?: string | (() => string | undefined);
  pusher?: PusherFactory;
}

export class PusherConnector implements EchoConnector {
  private client?: PusherLike;
  private readonly channels = new Map<string, PusherChannelLike>();
  private readonly auth: EchoAuthTransport;
  private readonly pusherFactory: PusherFactory;

  constructor(private readonly options: PusherConnectorOptions) {
    this.auth = options.authTransport
      ?? createAuthTransport({
        endpoint: options.authEndpoint,
        csrfToken: options.csrfToken,
      });
    this.pusherFactory = options.pusher ?? defaultPusherFactory;
  }

  get socketId(): string | undefined {
    return this.client?.connection.socket_id;
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = this.pusherFactory({
      key: this.options.key,
      cluster: this.options.cluster,
      forceTLS: this.options.forceTLS ?? true,
      authEndpoint: this.options.authEndpoint,
      authorizer: (channel, callback) => {
        const socketId = this.socketId;
        if (!socketId) {
          callback(new Error('Pusher socket id is not ready.'), '');
          return;
        }

        const channelName = (channel as { name?: string }).name ?? '';
        this.auth
          .authorize(socketId, channelName)
          .then((response) => callback(null, response.auth))
          .catch((error: unknown) => {
            callback(error instanceof Error ? error : new Error(String(error)), '');
          });
      },
    });
  }

  disconnect(): void {
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
    this.client?.disconnect();
    this.client = undefined;
  }

  async subscribe(channelName: string, options?: { channelData?: string }): Promise<void> {
    await this.connect();
    const client = this.client;
    if (!client) {
      throw new Error('Pusher client is not ready.');
    }

    if (this.channels.has(channelName)) {
      return;
    }

    if (channelName.startsWith('presence-') && options?.channelData) {
      await this.auth.authorize(client.connection.socket_id, channelName, options.channelData);
    }

    const channel = client.subscribe(channelName);
    this.channels.set(channelName, channel);
  }

  async unsubscribe(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return;
    }
    channel.unsubscribe();
    this.channels.delete(channelName);
  }

  listen(channelName: string, event: string, listener: EchoListener): void {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} is not subscribed.`);
    }
    channel.bind(event, listener);
  }

  stopListening(channelName: string, event: string, listener?: EchoListener): void {
    const channel = this.channels.get(channelName);
    if (!channel) {
      return;
    }
    channel.unbind(event, listener);
  }
}

function defaultPusherFactory(): PusherLike {
  throw new Error(
    'pusher-js is required for the Pusher Echo connector. Install it or pass options.pusher.',
  );
}