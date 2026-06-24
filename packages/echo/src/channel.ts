import { normalizeListenEvent } from './event-name.js';
import type { EchoConnector, EchoListener } from './types.js';

type ListenerMap = Map<string, Set<EchoListener>>;

export class EchoChannel {
  private readonly listeners: ListenerMap = new Map();
  private subscribed = false;
  private subscribePromise?: Promise<void>;

  constructor(
    readonly name: string,
    private readonly connector: EchoConnector,
    private readonly options: { channelData?: string } = {},
  ) {}

  async subscribe(): Promise<this> {
    if (!this.subscribed) {
      await this.connector.subscribe(this.name, this.options);
      this.subscribed = true;
      this.rebindListeners();
    }
    return this;
  }

  listen(event: string, listener: EchoListener): this {
    const normalized = normalizeListenEvent(event);
    const bucket = this.listeners.get(normalized) ?? new Set<EchoListener>();
    bucket.add(listener);
    this.listeners.set(normalized, bucket);

    void this.ensureSubscribed().then(() => {
      this.connector.listen(this.name, normalized, listener);
    });

    return this;
  }

  stopListening(event: string, listener?: EchoListener): this {
    const normalized = normalizeListenEvent(event);
    const bucket = this.listeners.get(normalized);
    if (!bucket) {
      return this;
    }

    if (listener) {
      bucket.delete(listener);
      this.connector.stopListening(this.name, normalized, listener);
      if (bucket.size === 0) {
        this.listeners.delete(normalized);
      }
      return this;
    }

    for (const registered of bucket) {
      this.connector.stopListening(this.name, normalized, registered);
    }
    this.listeners.delete(normalized);
    return this;
  }

  async leave(): Promise<void> {
    if (!this.subscribed) {
      return;
    }
    await this.connector.unsubscribe(this.name);
    this.subscribed = false;
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) {
      return;
    }
    if (!this.subscribePromise) {
      this.subscribePromise = this.subscribe()
        .then(() => undefined)
        .finally(() => {
          this.subscribePromise = undefined;
        });
    }
    await this.subscribePromise;
  }

  private rebindListeners(): void {
    for (const [event, bucket] of this.listeners.entries()) {
      for (const listener of bucket) {
        this.connector.listen(this.name, event, listener);
      }
    }
  }
}