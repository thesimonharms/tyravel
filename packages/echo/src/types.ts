export type EchoListener = (payload: unknown) => void;

export interface EchoAuthResponse {
  auth: string;
  channel_data?: string;
}

export interface EchoAuthTransport {
  authorize(socketId: string, channelName: string, channelData?: string): Promise<EchoAuthResponse>;
}

export interface EchoConnector {
  readonly socketId?: string;
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(channelName: string, options?: { channelData?: string }): Promise<void>;
  unsubscribe(channelName: string): Promise<void>;
  listen(channelName: string, event: string, listener: EchoListener): void;
  stopListening(channelName: string, event: string, listener?: EchoListener): void;
  bindPresenceEvents?(channelName: string, callbacks: PresenceCallbacks): void;
  unbindPresenceEvents?(channelName: string): void;
}

export type EchoDriver = 'socketio' | 'pusher' | 'null';

export interface EchoOptions {
  broadcaster: EchoDriver;
  authEndpoint?: string;
  authTransport?: EchoAuthTransport;
  csrfToken?: string | (() => string | undefined);
  host?: string;
  key?: string;
  cluster?: string;
  forceTLS?: boolean;
  connector?: EchoConnector;
}

export interface PresenceCallbacks<TMember = unknown> {
  here?: (members: TMember[]) => void;
  joining?: (member: TMember) => void;
  leaving?: (member: TMember) => void;
  error?: (error: unknown) => void;
}