import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import {
  PONDOKNUSA_WS_PATH,
  parseRedisBroadcastMessage,
  parseWsClientMessage,
  serializeWsServerMessage,
  verifyChannelAuthToken,
  type RedisBroadcastMessage,
} from '@pondoknusa/broadcasting';
import { acceptWebSocket, computeAcceptKey, writeUpgradeResponse, type WebSocketConnection } from './ws-framing.js';

type PresenceMember = {
  channelData: string;
  info: unknown;
};

type ClientState = {
  connection: WebSocketConnection;
  channels: Set<string>;
  presence: Map<string, PresenceMember>;
};

export class WebSocketHub {
  private readonly clients = new Map<string, ClientState>();
  private readonly presenceMembers = new Map<string, Map<string, PresenceMember>>();
  private redisHandler?: (message: RedisBroadcastMessage) => void;

  constructor(private readonly path: string = PONDOKNUSA_WS_PATH) {}

  attach(server: Server): void {
    server.on('upgrade', (request, socket, head) => {
      void this.handleUpgrade(request, socket as Socket, head);
    });
  }

  handleRedisMessage(raw: string): void {
    const message = parseRedisBroadcastMessage(raw);
    if (!message) {
      return;
    }
    this.dispatchBroadcast(message);
    this.redisHandler?.(message);
  }

  onRedisMessage(handler: (message: RedisBroadcastMessage) => void): void {
    this.redisHandler = handler;
  }

  get socketCount(): number {
    return this.clients.size;
  }

  private async handleUpgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== this.path) {
      socket.destroy();
      return;
    }

    const key = request.headers['sec-websocket-key'];
    if (!key || Array.isArray(key)) {
      socket.destroy();
      return;
    }

    writeUpgradeResponse(socket, computeAcceptKey(key));
    if (head.length > 0) {
      socket.unshift(head);
    }

    const connection = acceptWebSocket(socket);
    connection.onMessage((message) => {
      this.handleClientMessage(connection, message);
    });

    this.clients.set(connection.socketId, {
      connection,
      channels: new Set(),
      presence: new Map(),
    });

    connection.send(serializeWsServerMessage({
      type: 'connected',
      socketId: connection.socketId,
    }));

    connection.onClose(() => {
      this.removeClient(connection.socketId);
    });
  }

  private handleClientMessage(connection: WebSocketConnection, raw: string): void {
    const message = parseWsClientMessage(raw);
    if (!message) {
      connection.send(serializeWsServerMessage({
        type: 'error',
        message: 'Invalid WebSocket message.',
      }));
      return;
    }

    if (message.type === 'subscribe') {
      this.subscribe(connection.socketId, message.channel, message.auth, message.channelData);
      return;
    }

    if (message.type === 'unsubscribe') {
      this.unsubscribe(connection.socketId, message.channel);
    }
  }

  private subscribe(
    socketId: string,
    channelName: string,
    auth?: string,
    channelData?: string,
  ): void {
    const client = this.clients.get(socketId);
    if (!client) {
      return;
    }

    if (channelName.startsWith('private-') || channelName.startsWith('presence-')) {
      if (!auth || !verifyChannelAuthToken(socketId, channelName, auth, channelData)) {
        client.connection.send(serializeWsServerMessage({
          type: 'error',
          message: `Unauthorized channel subscription: ${channelName}`,
        }));
        return;
      }
    }

    client.channels.add(channelName);

    if (channelName.startsWith('presence-')) {
      this.joinPresence(socketId, channelName, channelData);
    }
  }

  private unsubscribe(socketId: string, channelName: string): void {
    const client = this.clients.get(socketId);
    if (!client) {
      return;
    }

    client.channels.delete(channelName);
    if (channelName.startsWith('presence-')) {
      this.leavePresence(socketId, channelName);
    }
  }

  private joinPresence(socketId: string, channelName: string, channelData?: string): void {
    const client = this.clients.get(socketId);
    if (!client) {
      return;
    }

    const info = parsePresenceInfo(channelData);
    const member: PresenceMember = {
      channelData: channelData ?? '{}',
      info,
    };

    let members = this.presenceMembers.get(channelName);
    if (!members) {
      members = new Map();
      this.presenceMembers.set(channelName, members);
    }

    const isNew = !members.has(socketId);
    members.set(socketId, member);
    client.presence.set(channelName, member);

    const memberList = [...members.values()].map((entry) => entry.info);
    client.connection.send(serializeWsServerMessage({
      type: 'presence:subscribed',
      channel: channelName,
      members: memberList,
    }));

    if (isNew) {
      this.broadcastToChannel(channelName, serializeWsServerMessage({
        type: 'presence:joining',
        channel: channelName,
        member: info,
      }), socketId);
    }
  }

  private leavePresence(socketId: string, channelName: string): void {
    const client = this.clients.get(socketId);
    const members = this.presenceMembers.get(channelName);
    const member = members?.get(socketId);
    if (!members || !member) {
      return;
    }

    members.delete(socketId);
    client?.presence.delete(channelName);
    if (members.size === 0) {
      this.presenceMembers.delete(channelName);
    }

    this.broadcastToChannel(channelName, serializeWsServerMessage({
      type: 'presence:leaving',
      channel: channelName,
      member: member.info,
    }), socketId);
  }

  private removeClient(socketId: string): void {
    const client = this.clients.get(socketId);
    if (!client) {
      return;
    }

    for (const channelName of [...client.presence.keys()]) {
      this.leavePresence(socketId, channelName);
    }

    this.clients.delete(socketId);
  }

  private dispatchBroadcast(message: RedisBroadcastMessage): void {
    for (const channelName of message.channels) {
      for (const [socketId, client] of this.clients.entries()) {
        if (!client.channels.has(channelName)) {
          continue;
        }
        if (message.socket && message.socket === socketId) {
          continue;
        }
        client.connection.send(serializeWsServerMessage({
          type: 'event',
          channel: channelName,
          event: message.event,
          data: message.data,
        }));
      }
    }
  }

  private broadcastToChannel(channelName: string, payload: string, exceptSocketId?: string): void {
    for (const [socketId, client] of this.clients.entries()) {
      if (exceptSocketId && socketId === exceptSocketId) {
        continue;
      }
      if (!client.channels.has(channelName)) {
        continue;
      }
      client.connection.send(payload);
    }
  }
}

function parsePresenceInfo(channelData?: string): unknown {
  if (!channelData) {
    return {};
  }

  try {
    const parsed = JSON.parse(channelData) as { user_info?: unknown };
    return parsed.user_info ?? parsed;
  } catch {
    return {};
  }
}