import type { PayloadCipher } from '@pondoknusa/crypto';
import type { DatabaseManager } from '@pondoknusa/database';
import type { RedisManager } from '@pondoknusa/redis';
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
    private readonly cipher?: PayloadCipher,
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
          this.cipher,
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
          this.config.prefix ?? 'pondoknusa:session',
          this.cipher,
        );
        break;
      }
      default:
        throw new Error(`Unsupported session driver: ${driver satisfies never}`);
    }

    return this.store;
  }
}