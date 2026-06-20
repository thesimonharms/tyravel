import { randomUUID } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import { decodePayload, encodePayload } from './payload.js';
import type {
  FailedJobRecord,
  FailedJobsConfig,
  RecordFailedJobInput,
} from './failed-job-types.js';
import type { SerializedJobPayload } from './types.js';

interface FailedJobsTableRow extends Record<string, unknown> {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failed_at: number;
}

export class FailedJobRepository {
  private readonly table: string;

  constructor(
    private readonly connection: DatabaseConnection,
    config: FailedJobsConfig = {},
  ) {
    this.table = config.table ?? 'failed_jobs';
  }

  async record(input: RecordFailedJobInput): Promise<number> {
    const id = await this.tableBuilder().insert({
      uuid: input.uuid,
      connection: input.connection,
      queue: input.queue,
      payload: input.payload,
      exception: input.exception,
      failed_at: unixNow(),
    });

    return Number(id);
  }

  async all(limit = 50): Promise<FailedJobRecord[]> {
    const rows = (await this.tableBuilder()
      .orderBy('id', 'desc')
      .limit(limit)
      .get()) as FailedJobsTableRow[];

    return rows.map(mapRow);
  }

  async find(id: number): Promise<FailedJobRecord | null> {
    const row = (await this.tableBuilder().where('id', id).first()) as
      | FailedJobsTableRow
      | null;
    return row ? mapRow(row) : null;
  }

  async retry(
    id: number,
    push: (payload: SerializedJobPayload, queue: string) => Promise<void>,
  ): Promise<boolean> {
    const record = await this.find(id);
    if (!record) {
      return false;
    }

    const payload = decodePayload(record.payload);
    await push(payload, record.queue);
    await this.tableBuilder().where('id', id).delete();
    return true;
  }

  async forget(id: number): Promise<boolean> {
    const deleted = await this.tableBuilder().where('id', id).delete();
    return deleted > 0;
  }

  private tableBuilder(): QueryBuilder<FailedJobsTableRow> {
    return new QueryBuilder<FailedJobsTableRow>(this.connection, this.table);
  }
}

export function formatJobException(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  }
  return String(error);
}

export function newFailedJobUuid(): string {
  return randomUUID();
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function mapRow(row: FailedJobsTableRow): FailedJobRecord {
  return {
    id: row.id,
    uuid: row.uuid,
    connection: row.connection,
    queue: row.queue,
    payload: row.payload,
    exception: row.exception,
    failedAt: row.failed_at,
  };
}