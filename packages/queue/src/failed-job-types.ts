export interface FailedJobsConfig {
  table?: string;
  database?: string;
}

export interface FailedJobRecord {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failedAt: number;
}

export interface RecordFailedJobInput {
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
}