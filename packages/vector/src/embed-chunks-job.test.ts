import { describe, expect, it } from 'vitest';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { JobRegistry, QueueWorker } from '@pondoknusa/queue';
import {
  EmbedChunksJob,
  registerEmbedModel,
  setEmbedChunksHandler,
  clearEmbedModels,
  resetEmbeddingFormatter,
} from './index.js';

class Chunk extends Model {
  static override table = 'chunks';
  static override vectorColumn = 'embedding';
}

describe('EmbedChunksJob', () => {
  it('embeds content for registered models', async () => {
    clearEmbedModels();
    resetEmbeddingFormatter();
    registerEmbedModel('Chunk', Chunk);

    const connection = new SqliteConnection(':memory:');
    Chunk.useConnection(connection);
    await connection.exec(`
      CREATE TABLE chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        embedding TEXT
      )
    `);

    const firstId = await Chunk.query().insert({ content: 'Native WebSockets' });
    const secondId = await Chunk.query().insert({ content: 'Vector search' });

    setEmbedChunksHandler(async (text) => {
      if (text.includes('WebSocket')) {
        return [1, 0];
      }
      return [0, 1];
    });

    const job = new EmbedChunksJob({
      model: 'Chunk',
      ids: [firstId as number, secondId as number],
    });
    await job.handle();

    const first = await Chunk.find(firstId as number) as Chunk;
    const second = await Chunk.find(secondId as number) as Chunk;
    expect(first.getAttribute('embedding')).toBe(JSON.stringify([1, 0]));
    expect(second.getAttribute('embedding')).toBe(JSON.stringify([0, 1]));
  });

  it('runs through the queue worker when registered', async () => {
    clearEmbedModels();
    resetEmbeddingFormatter();
    registerEmbedModel('Chunk', Chunk);
    setEmbedChunksHandler(async () => [0.5, 0.5]);

    const id = await Chunk.query().insert({ content: 'Queued chunk' });
    const registry = new JobRegistry().register(EmbedChunksJob);
    const worker = new QueueWorker(registry);

    await worker.process({
      job: EmbedChunksJob.name,
      data: {
        model: 'Chunk',
        ids: [id as number],
      },
    });

    const record = await Chunk.find(id as number) as Chunk;
    expect(record.getAttribute('embedding')).toBe(JSON.stringify([0.5, 0.5]));
  });
});