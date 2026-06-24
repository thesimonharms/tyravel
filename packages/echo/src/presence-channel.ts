import { EchoChannel } from './channel.js';
import type { EchoConnector, EchoListener, PresenceCallbacks } from './types.js';

export class PresenceChannel<TMember = unknown> extends EchoChannel {
  private presenceCallbacks: PresenceCallbacks<TMember> = {};

  constructor(
    name: string,
    connector: EchoConnector,
    channelData: string,
  ) {
    super(name, connector, { channelData });
  }

  override async subscribe(): Promise<this> {
    await super.subscribe();
    this.syncPresenceBindings();
    return this;
  }

  here(callback: (members: TMember[]) => void): this {
    this.presenceCallbacks.here = callback;
    void this.ensureSubscribed().then(() => this.syncPresenceBindings());
    return this;
  }

  joining(callback: (member: TMember) => void): this {
    this.presenceCallbacks.joining = callback;
    void this.ensureSubscribed().then(() => this.syncPresenceBindings());
    return this;
  }

  leaving(callback: (member: TMember) => void): this {
    this.presenceCallbacks.leaving = callback;
    void this.ensureSubscribed().then(() => this.syncPresenceBindings());
    return this;
  }

  error(callback: (error: unknown) => void): this {
    this.presenceCallbacks.error = callback;
    void this.ensureSubscribed().then(() => this.syncPresenceBindings());
    return this;
  }

  private syncPresenceBindings(): void {
    this.connector.bindPresenceEvents?.(
      this.name,
      this.presenceCallbacks as import('./types.js').PresenceCallbacks,
    );
  }

  override listen(event: string, listener: EchoListener): this {
    if (event === 'here' && typeof listener === 'function') {
      this.here(listener as (members: TMember[]) => void);
      return this;
    }
    if (event === 'joining' && typeof listener === 'function') {
      this.joining(listener as (member: TMember) => void);
      return this;
    }
    if (event === 'leaving' && typeof listener === 'function') {
      this.leaving(listener as (member: TMember) => void);
      return this;
    }
    return super.listen(event, listener);
  }

  getPresenceCallbacks(): PresenceCallbacks<TMember> {
    return this.presenceCallbacks;
  }
}