export const PONDOKNUSA_WS_PATH = '/pondoknusa/ws';
export const PONDOKNUSA_BROADCAST_REDIS_CHANNEL = 'pondoknusa:broadcast';

export type WsClientMessage =
  | { type: 'subscribe'; channel: string; auth?: string; channelData?: string }
  | { type: 'unsubscribe'; channel: string };

export type WsServerMessage =
  | { type: 'connected'; socketId: string }
  | { type: 'event'; channel: string; event: string; data: unknown }
  | { type: 'presence:subscribed'; channel: string; members: unknown[] }
  | { type: 'presence:joining'; channel: string; member: unknown }
  | { type: 'presence:leaving'; channel: string; member: unknown }
  | { type: 'error'; message: string };

export interface RedisBroadcastMessage {
  event: string;
  channels: string[];
  data: Record<string, unknown>;
  socket?: string | null;
}

export function parseWsClientMessage(raw: string): WsClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as WsClientMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }
    if (parsed.type === 'subscribe' && typeof parsed.channel === 'string') {
      return parsed;
    }
    if (parsed.type === 'unsubscribe' && typeof parsed.channel === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeWsServerMessage(message: WsServerMessage): string {
  return JSON.stringify(message);
}

export function parseRedisBroadcastMessage(raw: string): RedisBroadcastMessage | null {
  try {
    const parsed = JSON.parse(raw) as RedisBroadcastMessage;
    if (
      !parsed
      || typeof parsed !== 'object'
      || typeof parsed.event !== 'string'
      || !Array.isArray(parsed.channels)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildChannelAuthToken(
  socketId: string,
  channelName: string,
  channelData?: string,
): string {
  return channelData
    ? `${socketId}:${channelName}:${channelData}`
    : `${socketId}:${channelName}`;
}

export function verifyChannelAuthToken(
  socketId: string,
  channelName: string,
  auth: string,
  channelData?: string,
): boolean {
  return auth === buildChannelAuthToken(socketId, channelName, channelData);
}