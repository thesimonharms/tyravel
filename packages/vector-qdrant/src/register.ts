import { registerVectorSearchDriver } from '@pondoknusa/vector';
import { QdrantVectorSearchDriver } from './qdrant-search-driver.js';
import type { QdrantVectorConfig } from './qdrant-client.js';

export function registerQdrantVectorSearchDriver(config: QdrantVectorConfig): void {
  registerVectorSearchDriver(new QdrantVectorSearchDriver(config));
}