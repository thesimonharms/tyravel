import type { DatabaseManager } from '@tyravel/database';
import { DatabaseQueue } from './database-queue.js';
import type { QueueContract } from './queue-contract.js';
import { SyncQueue } from './sync-queue.js';
import type { QueueConfig, QueueConnectionConfig } from './types.js';
import { QueueWorker } from './worker.js';

export class QueueManager {
  private readonly queues = new Map<string, QueueContract>();

  constructor(
    private readonly config: QueueConfig,
    private readonly worker: QueueWorker,
    private readonly database?: DatabaseManager,
  ) {}

  connection(name?: string): QueueContract {
    const connectionName = name ?? this.config.default;
    const existing = this.queues.get(connectionName);
    if (existing) {
      return existing;
    }

    const connectionConfig = this.config.connections[connectionName];
    if (!connectionConfig) {
      throw new Error(`Queue connection not configured: ${connectionName}`);
    }

    const queue = this.createConnection(connectionConfig);
    this.queues.set(connectionName, queue);
    return queue;
  }

  getDefaultConnection(): string {
    return this.config.default;
  }

  private createConnection(config: QueueConnectionConfig): QueueContract {
    switch (config.driver) {
      case 'sync':
        return new SyncQueue(this.worker);
      case 'database': {
        if (!this.database) {
          throw new Error('Database manager is required for the database queue driver');
        }
        const dbConnection = this.database.connection(config.connection);
        return new DatabaseQueue(dbConnection, config);
      }
      default:
        throw new Error(`Unsupported queue driver: ${(config as QueueConnectionConfig).driver}`);
    }
  }
}