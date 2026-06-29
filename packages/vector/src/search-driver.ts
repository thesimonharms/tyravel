import type { ModelStatic } from '@pondoknusa/database';
import { MemoryVectorSearchDriver } from './memory-search-driver.js';
import type { Embedding, VectorSearchOptions } from './types.js';

export interface VectorSearchDriver {
  search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions,
  ): Promise<Record<string, unknown>[]>;
}

let activeDriver: VectorSearchDriver = new MemoryVectorSearchDriver();

export function registerVectorSearchDriver(driver: VectorSearchDriver): void {
  activeDriver = driver;
}

export function getVectorSearchDriver(): VectorSearchDriver {
  return activeDriver;
}

export async function searchVectors(
  model: ModelStatic,
  embedding: Embedding,
  options: VectorSearchOptions = {},
): Promise<Record<string, unknown>[]> {
  return activeDriver.search(model, embedding, options);
}