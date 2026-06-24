import type { EchoConnector, EchoListener } from '../types.js';

type Subscription = {
  listeners: Map<string, Set<EchoListener>>;
};

export class MockConnector implements EchoConnector {
  readonly socketId = 'mock-socket-id';
  private readonly subscriptions = new Map<string, Subscription>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.subscriptions.clear();
  }

  async subscribe(channelName: string): Promise<void> {
    if (!this.connected) {
      throw new Error('MockConnector is not connected.');
    }
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, { listeners: new Map() });
    }
  }

  async unsubscribe(channelName: string): Promise<void> {
    this.subscriptions.delete(channelName);
  }

  listen(channelName: string, event: string, listener: EchoListener): void {
    const subscription = this.subscriptions.get(channelName);
    if (!subscription) {
      throw new Error(`Channel ${channelName} is not subscribed.`);
    }
    const bucket = subscription.listeners.get(event) ?? new Set<EchoListener>();
    bucket.add(listener);
    subscription.listeners.set(event, bucket);
  }

  stopListening(channelName: string, event: string, listener?: EchoListener): void {
    const subscription = this.subscriptions.get(channelName);
    if (!subscription) {
      return;
    }
    const bucket = subscription.listeners.get(event);
    if (!bucket) {
      return;
    }
    if (listener) {
      bucket.delete(listener);
      return;
    }
    subscription.listeners.delete(event);
  }

  emit(channelName: string, event: string, payload: unknown): void {
    const subscription = this.subscriptions.get(channelName);
    if (!subscription) {
      return;
    }
    const bucket = subscription.listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of bucket) {
      listener(payload);
    }
  }
}