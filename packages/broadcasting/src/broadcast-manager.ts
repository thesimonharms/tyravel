import { ArrayBroadcaster } from './array-broadcaster.js';
import { LogBroadcaster } from './log-broadcaster.js';
import { NullBroadcaster } from './null-broadcaster.js';
import type {
  BroadcastConnectionConfig,
  Broadcaster,
  BroadcasterFactory,
  BroadcastingConfig,
} from './types.js';

export class BroadcastManager {
  private static readonly drivers = new Map<string, BroadcasterFactory>();

  private readonly broadcasters = new Map<string, Broadcaster>();

  constructor(private readonly config: BroadcastingConfig) {}

  static extend(name: string, factory: BroadcasterFactory): void {
    BroadcastManager.drivers.set(name, factory);
  }

  connection(name?: string): Broadcaster {
    const connectionName = name ?? this.config.default;
    const existing = this.broadcasters.get(connectionName);
    if (existing) {
      return existing;
    }

    const connectionConfig = this.config.connections[connectionName];
    if (!connectionConfig) {
      throw new Error(`Broadcast connection [${connectionName}] is not configured.`);
    }

    const broadcaster = this.createConnection(connectionConfig);
    this.broadcasters.set(connectionName, broadcaster);
    return broadcaster;
  }

  getDefaultConnection(): string {
    return this.config.default;
  }

  private createConnection(config: BroadcastConnectionConfig): Broadcaster {
    switch (config.driver) {
      case 'null':
        return new NullBroadcaster();
      case 'log':
        return new LogBroadcaster();
      case 'fake':
        return new ArrayBroadcaster();
      default: {
        const factory = BroadcastManager.drivers.get(config.driver);
        if (!factory) {
          throw new Error(
            `Broadcast driver [${config.driver}] is not registered. Install the matching @pondoknusa/broadcasting-* package.`,
          );
        }
        return factory(config);
      }
    }
  }
}