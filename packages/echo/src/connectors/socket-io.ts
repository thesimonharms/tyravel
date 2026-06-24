import { createAuthTransport } from '../auth.js';
import {
  bindConnectorPresenceEvents,
  unbindConnectorPresenceEvents,
} from '../presence-events.js';
import type { EchoAuthTransport, EchoConnector, EchoListener, PresenceCallbacks } from '../types.js';

export interface SocketIoLike {
  id?: string;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
}

export type SocketIoFactory = (options: {
  host?: string;
  path?: string;
  transports?: string[];
}) => SocketIoLike;

export interface SocketIoConnectorOptions {
  host?: string;
  path?: string;
  authEndpoint?: string;
  authTransport?: EchoAuthTransport;
  csrfToken?: string | (() => string | undefined);
  io?: SocketIoFactory;
}

type EventBinding = {
  channelName: string;
  listener: EchoListener;
  socketHandler: EchoListener;
};

export class SocketIoConnector implements EchoConnector {
  private socket?: SocketIoLike;
  private readonly subscribed = new Set<string>();
  private readonly bindings = new Map<string, EventBinding[]>();
  private readonly auth: EchoAuthTransport;
  private readonly ioFactory: SocketIoFactory;

  constructor(private readonly options: SocketIoConnectorOptions = {}) {
    this.auth = options.authTransport
      ?? createAuthTransport({
        endpoint: options.authEndpoint,
        csrfToken: options.csrfToken,
      });
    this.ioFactory = options.io ?? defaultSocketIoFactory;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  async connect(): Promise<void> {
    if (this.socket) {
      return;
    }

    this.socket = this.ioFactory({
      host: this.options.host,
      path: this.options.path ?? '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }

  disconnect(): void {
    const socket = this.socket;
    if (socket) {
      for (const [event, entries] of this.bindings.entries()) {
        for (const entry of entries) {
          socket.off(event, entry.socketHandler);
        }
      }
    }
    this.socket?.disconnect();
    this.socket = undefined;
    this.subscribed.clear();
    this.bindings.clear();
  }

  async subscribe(channelName: string, options?: { channelData?: string }): Promise<void> {
    await this.connect();
    const socket = this.socket;
    if (!socket?.id) {
      throw new Error('Socket.io connection is not ready.');
    }

    if (this.subscribed.has(channelName)) {
      return;
    }

    let auth: string | undefined;
    if (channelName.startsWith('private-') || channelName.startsWith('presence-')) {
      const response = await this.auth.authorize(socket.id, channelName, options?.channelData);
      auth = response.auth;
    }

    socket.emit('subscribe', {
      channel: channelName,
      auth,
    });

    this.subscribed.add(channelName);
  }

  async unsubscribe(channelName: string): Promise<void> {
    const socket = this.socket;
    if (!socket || !this.subscribed.has(channelName)) {
      return;
    }

    socket.emit('unsubscribe', { channel: channelName });
    this.subscribed.delete(channelName);

    for (const [event, entries] of this.bindings.entries()) {
      const remaining = entries.filter((entry) => entry.channelName !== channelName);
      const removed = entries.filter((entry) => entry.channelName === channelName);
      for (const entry of removed) {
        socket.off(event, entry.socketHandler);
      }
      if (remaining.length === 0) {
        this.bindings.delete(event);
      } else {
        this.bindings.set(event, remaining);
      }
    }
  }

  listen(channelName: string, event: string, listener: EchoListener): void {
    const socket = this.socket;
    if (!socket) {
      throw new Error('Socket.io connection is not ready.');
    }

    const socketHandler: EchoListener = (...args: unknown[]) => {
      if (!this.subscribed.has(channelName)) {
        return;
      }

      let payload: unknown;
      if (args.length >= 2 && typeof args[0] === 'string') {
        if (args[0] !== channelName) {
          return;
        }
        payload = args[1];
      } else {
        payload = args[0];
      }

      listener(payload);
    };

    const entries = this.bindings.get(event) ?? [];
    entries.push({ channelName, listener, socketHandler });
    this.bindings.set(event, entries);
    socket.on(event, socketHandler);
  }

  stopListening(channelName: string, event: string, listener?: EchoListener): void {
    const socket = this.socket;
    const entries = this.bindings.get(event);
    if (!socket || !entries) {
      return;
    }

    const remaining: EventBinding[] = [];
    for (const entry of entries) {
      if (entry.channelName !== channelName) {
        remaining.push(entry);
        continue;
      }
      if (listener && entry.listener !== listener) {
        remaining.push(entry);
        continue;
      }
      socket.off(event, entry.socketHandler);
    }

    if (remaining.length === 0) {
      this.bindings.delete(event);
    } else {
      this.bindings.set(event, remaining);
    }
  }

  bindPresenceEvents(channelName: string, callbacks: PresenceCallbacks): void {
    bindConnectorPresenceEvents(this, channelName, callbacks, 'socketio');
  }

  unbindPresenceEvents(channelName: string): void {
    unbindConnectorPresenceEvents(this, channelName);
  }
}

function defaultSocketIoFactory(): SocketIoLike {
  throw new Error(
    'socket.io-client is required for the Socket.io Echo connector. Install it or pass options.io.',
  );
}