import { createAuthTransport } from '../auth.js';
import {
  bindConnectorPresenceEvents,
  unbindConnectorPresenceEvents,
} from '../presence-events.js';
import { LifecycleRegistry } from '../lifecycle.js';
import type {
  EchoAuthTransport,
  EchoConnector,
  EchoLifecycleCallbacks,
  EchoListener,
  PresenceCallbacks,
} from '../types.js';

const DEFAULT_WS_PATH = '/pondoknusa/ws';

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (...args: unknown[]) => void): void;
  removeEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (...args: unknown[]) => void): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface WebSocketConnectorOptions {
  host?: string;
  path?: string;
  authEndpoint?: string;
  authTransport?: EchoAuthTransport;
  csrfToken?: string | (() => string | undefined);
  webSocket?: WebSocketFactory;
  reconnectDelayMs?: number;
}

type EventBinding = {
  channelName: string;
  listener: EchoListener;
  handler: EchoListener;
};

type ServerMessage =
  | { type: 'connected'; socketId: string }
  | { type: 'event'; channel: string; event: string; data: unknown }
  | { type: 'presence:subscribed'; channel: string; members: unknown[] }
  | { type: 'presence:joining'; channel: string; member: unknown }
  | { type: 'presence:leaving'; channel: string; member: unknown }
  | { type: 'error'; message: string };

export class WebSocketConnector implements EchoConnector {
  private socket?: WebSocketLike;
  private _socketId?: string;
  private intentionalClose = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private readonly subscribed = new Set<string>();
  private readonly bindings = new Map<string, EventBinding[]>();
  private readonly pendingSubscriptions = new Map<string, { channelData?: string }>();
  private readonly lifecycle = new LifecycleRegistry();
  private readonly auth: EchoAuthTransport;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly reconnectDelayMs: number;

  constructor(private readonly options: WebSocketConnectorOptions = {}) {
    this.auth = options.authTransport
      ?? createAuthTransport({
        endpoint: options.authEndpoint,
        csrfToken: options.csrfToken,
      });
    this.webSocketFactory = options.webSocket ?? defaultWebSocketFactory;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1_000;
  }

  get socketId(): string | undefined {
    return this._socketId;
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === 1) {
      return;
    }

    this.intentionalClose = false;
    const url = resolveWebSocketUrl(this.options.host, this.options.path ?? DEFAULT_WS_PATH);
    const socket = this.webSocketFactory(url);
    this.socket = socket;
    this.bindSocketHandlers(socket);
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
    this._socketId = undefined;
    this.subscribed.clear();
    this.pendingSubscriptions.clear();
  }

  bindLifecycle(callbacks: EchoLifecycleCallbacks): void {
    this.lifecycle.set(callbacks);
  }

  async subscribe(channelName: string, options?: { channelData?: string }): Promise<void> {
    await this.connect();
    if (!this._socketId) {
      this.pendingSubscriptions.set(channelName, options ?? {});
      return;
    }

    if (this.subscribed.has(channelName)) {
      return;
    }

    let auth: string | undefined;
    let channelData = options?.channelData;
    if (channelName.startsWith('private-') || channelName.startsWith('presence-')) {
      const response = await this.auth.authorize(this._socketId, channelName, channelData);
      auth = response.auth;
      channelData = response.channel_data ?? channelData;
    }

    this.send({
      type: 'subscribe',
      channel: channelName,
      auth,
      channelData,
    });
    this.subscribed.add(channelName);
  }

  async unsubscribe(channelName: string): Promise<void> {
    if (!this.subscribed.has(channelName)) {
      return;
    }

    this.send({ type: 'unsubscribe', channel: channelName });
    this.subscribed.delete(channelName);
    this.clearBindingsForChannel(channelName);
  }

  listen(channelName: string, event: string, listener: EchoListener): void {
    const handler: EchoListener = (payload) => {
      if (!this.subscribed.has(channelName)) {
        return;
      }
      listener(payload);
    };

    const key = bindingKey(channelName, event);
    const entries = this.bindings.get(key) ?? [];
    entries.push({ channelName, listener, handler });
    this.bindings.set(key, entries);
  }

  stopListening(channelName: string, event: string, listener?: EchoListener): void {
    const key = bindingKey(channelName, event);
    const entries = this.bindings.get(key);
    if (!entries) {
      return;
    }

    const remaining = listener
      ? entries.filter((entry) => entry.listener !== listener)
      : [];
    if (remaining.length === 0) {
      this.bindings.delete(key);
    } else {
      this.bindings.set(key, remaining);
    }
  }

  bindPresenceEvents(channelName: string, callbacks: PresenceCallbacks): void {
    bindConnectorPresenceEvents(this, channelName, callbacks, 'websocket');
  }

  unbindPresenceEvents(channelName: string): void {
    unbindConnectorPresenceEvents(this, channelName);
  }

  private bindSocketHandlers(socket: WebSocketLike): void {
    socket.addEventListener('message', (event) => {
      const data = (event as { data?: unknown }).data;
      if (typeof data !== 'string') {
        return;
      }
      this.handleServerMessage(data);
    });

    socket.addEventListener('close', () => {
      this._socketId = undefined;
      this.lifecycle.emit('disconnected');
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  private handleServerMessage(raw: string): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'connected':
        this._socketId = message.socketId;
        this.lifecycle.emit('connected');
        void this.flushPendingSubscriptions();
        this.reattachBindings();
        break;
      case 'event':
        this.dispatch(channelNameKey(message.channel, message.event), message.data);
        break;
      case 'presence:subscribed':
        this.dispatch(channelNameKey(message.channel, 'presence:subscribed'), message.members);
        break;
      case 'presence:joining':
        this.dispatch(channelNameKey(message.channel, 'presence:joining'), message.member);
        break;
      case 'presence:leaving':
        this.dispatch(channelNameKey(message.channel, 'presence:leaving'), message.member);
        break;
      case 'error':
        break;
    }
  }

  private dispatch(key: string, payload: unknown): void {
    for (const entry of this.bindings.get(key) ?? []) {
      entry.handler(payload);
    }
  }

  private send(message: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== 1) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.intentionalClose) {
      return;
    }
    this.lifecycle.emit('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect().then(() => this.resubscribeAll());
    }, this.reconnectDelayMs);
  }

  private async flushPendingSubscriptions(): Promise<void> {
    const pending = [...this.pendingSubscriptions.entries()];
    this.pendingSubscriptions.clear();
    for (const [channelName, options] of pending) {
      await this.subscribe(channelName, options);
    }
  }

  private async resubscribeAll(): Promise<void> {
    const channels = [...this.subscribed];
    this.subscribed.clear();
    for (const channelName of channels) {
      await this.subscribe(channelName);
    }
  }

  private reattachBindings(): void {
    // Bindings are keyed and dispatched directly; no socket-level rebind needed.
  }

  private clearBindingsForChannel(channelName: string): void {
    for (const [key, entries] of this.bindings.entries()) {
      const remaining = entries.filter((entry) => entry.channelName !== channelName);
      if (remaining.length === 0) {
        this.bindings.delete(key);
      } else {
        this.bindings.set(key, remaining);
      }
    }
  }
}

function bindingKey(channelName: string, event: string): string {
  return channelNameKey(channelName, event);
}

function channelNameKey(channelName: string, event: string): string {
  return `${channelName}:${event}`;
}

function resolveWebSocketUrl(host: string | undefined, path: string): string {
  const base = host
    ?? (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000');
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = path.startsWith('/') ? path : `/${path}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function defaultWebSocketFactory(): WebSocketLike {
  throw new Error(
    'Native WebSocket is required for the websocket Echo connector. Use it in a browser/runtime with WebSocket support, or pass options.webSocket.',
  );
}