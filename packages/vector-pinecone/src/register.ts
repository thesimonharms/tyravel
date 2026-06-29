import { registerVectorSearchDriver } from '@pondoknusa/vector';
import { PineconeVectorSearchDriver } from './pinecone-search-driver.js';
import type { PineconeVectorConfig } from './pinecone-client.js';

export function registerPineconeVectorSearchDriver(config: PineconeVectorConfig): void {
  registerVectorSearchDriver(new PineconeVectorSearchDriver(config));
}