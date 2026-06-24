import { EchoChannel } from './channel.js';
import { MockConnector } from './connectors/mock.js';
import { PusherConnector } from './connectors/pusher.js';
import { SocketIoConnector } from './connectors/socket-io.js';
import { formatChannelName } from './event-name.js';
import { PresenceChannel } from './presence-channel.js';
import type { EchoConnector, EchoOptions } from './types.js';

export class Echo {
  private readonly connector: EchoConnector;
  private readonly channels = new Map<string, EchoChannel | PresenceChannel>();

  constructor(options: EchoOptions) {
    this.connector = options.connector ?? createConnector(options);
  }

  channel(name: string): EchoChannel {
    return this.rememberChannel(name, () => new EchoChannel(formatChannelName(name, 'public'), this.connector));
  }

  private(name: string): EchoChannel {
    const channelName = formatChannelName(name, 'private');
    return this.rememberChannel(channelName, () => new EchoChannel(channelName, this.connector));
  }

  join<TMember = unknown>(name: string, data: Record<string, unknown> = {}): PresenceChannel<TMember> {
    const channelName = formatChannelName(name, 'presence');
    const channelData = JSON.stringify(data);
    const existing = this.channels.get(channelName);
    if (existing instanceof PresenceChannel) {
      return existing as PresenceChannel<TMember>;
    }

    const channel = new PresenceChannel<TMember>(channelName, this.connector, channelData);
    this.channels.set(channelName, channel);
    return channel;
  }

  leave(name: string): void {
    const channelName = formatChannelName(name, 'public');
    const variants = [
      channelName,
      formatChannelName(name, 'private'),
      formatChannelName(name, 'presence'),
    ];

    for (const variant of variants) {
      const channel = this.channels.get(variant);
      if (!channel) {
        continue;
      }
      void channel.leave();
      this.channels.delete(variant);
    }
  }

  disconnect(): void {
    for (const channel of this.channels.values()) {
      void channel.leave();
    }
    this.channels.clear();
    this.connector.disconnect();
  }

  connectorInstance(): EchoConnector {
    return this.connector;
  }

  private rememberChannel(name: string, factory: () => EchoChannel): EchoChannel {
    const existing = this.channels.get(name);
    if (existing) {
      return existing;
    }
    const channel = factory();
    this.channels.set(name, channel);
    return channel;
  }
}

function createConnector(options: EchoOptions): EchoConnector {
  if (options.broadcaster === 'null') {
    return new MockConnector();
  }

  if (options.broadcaster === 'socketio') {
    return new SocketIoConnector({
      host: options.host,
      authEndpoint: options.authEndpoint,
      csrfToken: options.csrfToken,
    });
  }

  if (options.broadcaster === 'pusher') {
    if (!options.key) {
      throw new Error('Echo pusher connector requires a `key` option.');
    }
    return new PusherConnector({
      key: options.key,
      cluster: options.cluster,
      forceTLS: options.forceTLS,
      authEndpoint: options.authEndpoint,
      csrfToken: options.csrfToken,
    });
  }

  throw new Error(`Unsupported Echo broadcaster: ${String(options.broadcaster)}`);
}