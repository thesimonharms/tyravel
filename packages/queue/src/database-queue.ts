import { randomUUID } from 'node:crypto';
import type { DatabaseConnection } from '@pondoknusa/database';
import { QueryBuilder } from '@pondoknusa/database';
import type { Job } from './job.js';
import { decodePayload, encodePayload, serializeJob } from './payload.js';
import type { QueueContract } from './queue-contract.js';
import type { WorkerQueue } from './worker-queue.js';
import type {
  DatabaseQueueConnectionConfig,
  QueueJobRecord,
  SerializedJobPayload,
} from './types.js';

interface JobsTableRow extends Record<string, unknown> {
  id: number;
  queue: string;
  payload: string;
  attempts: number;
  reserved_at: number | null;
  available_at: number;
  created_at: number;
}

export class DatabaseQueue implements QueueContract, WorkerQueue {
  private readonly table: string;
  private readonly retryAfter: number;

  constructor(
    private readonly connection: DatabaseConnection,
    config: DatabaseQueueConnectionConfig = { driver: 'database' },
  ) {
    this.table = config.table ?? 'jobs';
    this.retryAfter = config.retryAfter ?? 90;
  }

  async push(job: Job, queue = 'default'): Promise<string> {
    return this.pushRaw(serializeJob(job), queue);
  }

  async pushRaw(payload: SerializedJobPayload, queue = 'default'): Promise<string> {
    const now = unixNow();
    const id = await this.tableBuilder().insert({
      queue,
      payload: encodePayload(payload),
      attempts: 0,
      reserved_at: null,
      available_at: now,
      created_at: now,
    });

    return String(id ?? randomUUID());
  }

  async later(delaySeconds: number, job: Job, queue = 'default'): Promise<string> {
    const payload = serializeJob(job);
    const now = unixNow();
    const id = await this.tableBuilder().insert({
      queue,
      payload: encodePayload(payload),
      attempts: 0,
      reserved_at: null,
      available_at: now + delaySeconds,
      created_at: now,
    });

    return String(id ?? randomUUID());
  }

  async pop(queue = 'default'): Promise<QueueJobRecord | null> {
    const now = unixNow();
    const grammar = this.connection.grammar;
    const table = grammar.wrapIdentifier(this.table);
    const result = await this.connection.query(
      `SELECT id, queue, payload, attempts, reserved_at, available_at, created_at
       FROM ${table}
       WHERE ${grammar.wrapIdentifier('queue')} = ${grammar.parameter(1)}
         AND ${grammar.wrapIdentifier('reserved_at')} IS NULL
         AND ${grammar.wrapIdentifier('available_at')} <= ${grammar.parameter(2)}
       ORDER BY ${grammar.wrapIdentifier('id')} ASC
       LIMIT 1`,
      [queue, now],
    );

    const row = result.rows[0] as JobsTableRow | undefined;
    if (!row) {
      return null;
    }

    await this.tableBuilder()
      .where('id', row.id)
      .update({ reserved_at: now });

    return mapRow(row);
  }

  async deleteJob(id: number): Promise<void> {
    await this.tableBuilder().where('id', id).delete();
  }

  async release(id: number, delaySeconds = 0): Promise<void> {
    const row = (await this.tableBuilder().where('id', id).first()) as JobsTableRow | null;
    if (!row) {
      return;
    }

    await this.tableBuilder()
      .where('id', id)
      .update({
        reserved_at: null,
        available_at: unixNow() + delaySeconds,
        attempts: row.attempts + 1,
      });
  }

  decode(record: QueueJobRecord) {
    return decodePayload(record.payload);
  }

  getRetryAfter(): number {
    return this.retryAfter;
  }

  private tableBuilder(): QueryBuilder<JobsTableRow> {
    return new QueryBuilder<JobsTableRow>(this.connection, this.table);
  }
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function mapRow(row: JobsTableRow): QueueJobRecord {
  return {
    id: row.id,
    queue: row.queue,
    payload: row.payload,
    attempts: row.attempts,
    reservedAt: row.reserved_at,
    availableAt: row.available_at,
    createdAt: row.created_at,
  };
}