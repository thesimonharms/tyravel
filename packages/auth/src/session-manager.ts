import type { DatabaseManager } from '@tyravel/database';
import type { RedisManager } from '@tyravel/redis';
import { DatabaseSessionStore, MemorySessionStore } from './session-store.js';
import { RedisSessionStore } from './redis-session-store.js';
import type { SessionStore } from './session.js';
import type { AuthSessionConfig } from './types.js';

export class SessionManager {
  private store?: SessionStore;

  constructor(
    private readonly config: AuthSessionConfig,
    private readonly database?: DatabaseManager,
    private readonly redis?: RedisManager,
  ) {}

  driver(): SessionStore {
    if (this.store) {
      return this.store;
    }

    const driver = this.config.driver ?? 'database';
    switch (driver) {
      case 'array':
        this.store = new MemorySessionStore();
        break;
      case 'database': {
        if (!this.database) {
          throw new Error('Database manager is required for the database session driver');
        }
        const connection = this.database.connection(this.config.connection);
        this.store = new DatabaseSessionStore(
          connection,
          this.config.table ?? 'sessions',
        );
        break;
      }
      case 'redis': {
        if (!this.redis) {
          throw new Error('Redis manager is required for the redis session driver');
        }
        this.store = new RedisSessionStore(
          this.redis,
          this.config.redisConnection ?? 'default',
          this.config.prefix ?? 'tyravel:session',
        );
        break;
      }
      default:
        throw new Error(`Unsupported session driver: ${driver satisfies never}`);
    }

    return this.store;
  }
}