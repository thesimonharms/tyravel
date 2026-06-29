import type { PondoknusaRequest } from '@pondoknusa/http';
import type { AdminField } from './types.js';
import { parseAdminInputWithFiles, type StorageLike } from './file-upload.js';

export async function parseAdminInput(
  request: PondoknusaRequest,
  fields: AdminField[],
  storage?: StorageLike,
): Promise<Record<string, unknown>> {
  return parseAdminInputWithFiles(request, fields, storage);
}

export function parseBulkIds(request: PondoknusaRequest, body?: Record<string, unknown>): number[] {
  const fromQuery = request.query('ids');
  if (fromQuery) {
    return fromQuery.split(',').map(Number).filter(Number.isFinite);
  }

  const raw = body?.['ids[]'] ?? body?.ids;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(Number).filter(Number.isFinite);
}