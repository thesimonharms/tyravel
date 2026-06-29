import {
  registerLocalVectorSearchDriver,
  registerVectorSearchDriver,
  setEmbeddingFormatter,
} from '@pondoknusa/vector';
import type { DatabaseConnection } from '@pondoknusa/database';
import { formatPgVector } from './pgvector.js';
import { PgVectorSearchDriver } from './pgvector-search-driver.js';

export function registerPgVectorSearchDriver(): void {
  registerVectorSearchDriver(new PgVectorSearchDriver());
  setEmbeddingFormatter(formatPgVector);
}

export function registerVectorSearchForConnection(connection: DatabaseConnection): void {
  if (connection.grammar.driver === 'postgres') {
    registerPgVectorSearchDriver();
    return;
  }

  registerLocalVectorSearchDriver(connection.grammar.driver === 'sqlite' ? 'sqlite' : 'memory');
}