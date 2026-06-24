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

  here(callback: (members: TMember[]) => void): this {
    this.presenceCallbacks.here = callback;
    return this;
  }

  joining(callback: (member: TMember) => void): this {
    this.presenceCallbacks.joining = callback;
    return this;
  }

  leaving(callback: (member: TMember) => void): this {
    this.presenceCallbacks.leaving = callback;
    return this;
  }

  error(callback: (error: unknown) => void): this {
    this.presenceCallbacks.error = callback;
    return this;
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