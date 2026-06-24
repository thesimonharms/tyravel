import type { EchoConnector, EchoListener, PresenceCallbacks } from './types.js';

const PUSHER_PRESENCE_EVENTS = {
  here: 'pusher:subscription_succeeded',
  joining: 'pusher:member_added',
  leaving: 'pusher:member_removed',
  error: 'pusher:subscription_error',
} as const;

const SOCKETIO_PRESENCE_EVENTS = {
  here: 'presence:subscribed',
  joining: 'presence:joining',
  leaving: 'presence:leaving',
} as const;

type PresenceBinding = {
  event: string;
  listener: EchoListener;
};

const presenceBindings = new WeakMap<EchoConnector, Map<string, PresenceBinding[]>>();

export function bindConnectorPresenceEvents(
  connector: EchoConnector,
  channelName: string,
  callbacks: PresenceCallbacks,
  driver: 'pusher' | 'socketio',
): void {
  unbindConnectorPresenceEvents(connector, channelName);

  const bindings: PresenceBinding[] = [];
  const events = driver === 'pusher' ? PUSHER_PRESENCE_EVENTS : SOCKETIO_PRESENCE_EVENTS;

  if (callbacks.here) {
    const listener = createHereListener(callbacks.here, driver);
    connector.listen(channelName, events.here, listener);
    bindings.push({ event: events.here, listener });
  }

  if (callbacks.joining) {
    const listener = createJoiningListener(callbacks.joining, driver);
    connector.listen(channelName, events.joining, listener);
    bindings.push({ event: events.joining, listener });
  }

  if (callbacks.leaving) {
    const listener = createLeavingListener(callbacks.leaving, driver);
    connector.listen(channelName, events.leaving, listener);
    bindings.push({ event: events.leaving, listener });
  }

  if (driver === 'pusher' && callbacks.error) {
    connector.listen(channelName, PUSHER_PRESENCE_EVENTS.error, callbacks.error);
    bindings.push({ event: PUSHER_PRESENCE_EVENTS.error, listener: callbacks.error });
  }

  if (bindings.length === 0) {
    return;
  }

  const byChannel = presenceBindings.get(connector) ?? new Map<string, PresenceBinding[]>();
  byChannel.set(channelName, bindings);
  presenceBindings.set(connector, byChannel);
}

export function unbindConnectorPresenceEvents(
  connector: EchoConnector,
  channelName: string,
): void {
  const byChannel = presenceBindings.get(connector);
  const bindings = byChannel?.get(channelName);
  if (!bindings) {
    return;
  }

  for (const binding of bindings) {
    connector.stopListening(channelName, binding.event, binding.listener);
  }

  byChannel?.delete(channelName);
}

function createHereListener(
  callback: (members: unknown[]) => void,
  driver: 'pusher' | 'socketio',
): EchoListener {
  return (payload) => {
    if (driver === 'pusher') {
      const data = payload as { members?: Record<string, unknown> };
      callback(Object.values(data.members ?? {}));
      return;
    }

    const members = Array.isArray(payload) ? payload : [];
    callback(members.map((member) => extractMemberInfo(member)));
  };
}

function createJoiningListener(
  callback: (member: unknown) => void,
  driver: 'pusher' | 'socketio',
): EchoListener {
  return (payload) => {
    if (driver === 'pusher') {
      callback((payload as { info?: unknown }).info ?? payload);
      return;
    }

    callback(extractMemberInfo(payload));
  };
}

function createLeavingListener(
  callback: (member: unknown) => void,
  driver: 'pusher' | 'socketio',
): EchoListener {
  return createJoiningListener(callback, driver);
}

function extractMemberInfo(member: unknown): unknown {
  if (member && typeof member === 'object' && 'user_info' in member) {
    return (member as { user_info: unknown }).user_info;
  }

  return member;
}