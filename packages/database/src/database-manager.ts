import type { DatabaseConnection } from './connection.js';
import { runWithConnection } from './connection-context.js';
import { SqliteConnection } from './sqlite-connection.js';
import type {
  ConnectionConfig,
  DatabaseConfig,
  DatabaseDriverFactory,
  SqliteConnectionConfig,
} from './types.js';

export class DatabaseManager {
  private static readonly drivers = new Map<string, DatabaseDriverFactory>();

  private readonly connections = new Map<string, DatabaseConnection>();

  constructor(
    private readonly config: DatabaseConfig,
    private readonly basePath = process.cwd(),
  ) {}

  static extend(name: string, factory: DatabaseDriverFactory): void {
    DatabaseManager.drivers.set(name, factory);
  }

  connection(name?: string): DatabaseConnection {
    const connectionName = name ?? this.config.default;
    const existing = this.connections.get(connectionName);
    if (existing) {
      return existing;
    }

    const connectionConfig = this.config.connections[connectionName];
    if (!connectionConfig) {
      throw new Error(`Database connection not configured: ${connectionName}`);
    }

    const connection = this.createConnection(connectionConfig);
    this.connections.set(connectionName, connection);
    return connection;
  }

  async transaction<T>(
    callback: () => Promise<T>,
    name?: string,
  ): Promise<T> {
    const connection = this.connection(name);
    return connection.transaction(async (transactional) =>
      runWithConnection(transactional, callback),
    );
  }

  async close(name?: string): Promise<void> {
    if (name) {
      const connection = this.connections.get(name);
      await connection?.close?.();
      this.connections.delete(name);
      return;
    }

    await Promise.all(
      [...this.connections.values()].map((connection) => connection.close?.()),
    );
    this.connections.clear();
  }

  private createConnection(config: ConnectionConfig): DatabaseConnection {
    switch (config.driver) {
      case 'sqlite':
        return new SqliteConnection(
          (config as SqliteConnectionConfig).database,
          this.basePath,
        );
      default: {
        const factory = DatabaseManager.drivers.get(config.driver);
        if (factory) {
          return factory(config, this.basePath);
        }
        throw new Error(
          `Unsupported database driver [${config.driver}]. Register it with DatabaseManager.extend() or install a driver package.`,
        );
      }
    }
  }
}