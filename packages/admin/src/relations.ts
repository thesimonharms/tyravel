import type { Model, ModelStatic } from '@pondoknusa/database';
import type { AdminField, AdminHasManySection } from './types.js';

export interface RelationOption {
  value: string | number;
  label: string;
}

export async function loadBelongsToOptions(field: AdminField): Promise<RelationOption[]> {
  const relation = field.relation;
  if (!relation) {
    return [];
  }

  const primaryKey = (relation.model as { primaryKey?: string }).primaryKey ?? 'id';
  const models = await relation.model.query().limit(200).getModels<Model>();
  return models.map((row: Model) => {
    const value = row.getAttribute(primaryKey as never);
    const label = row.getAttribute(relation.displayColumn as never);
    return {
      value: value as string | number,
      label: String(label ?? value),
    };
  });
}

export async function buildRelationLabels(
  fields: AdminField[],
): Promise<Record<string, Map<string, string>>> {
  const labels: Record<string, Map<string, string>> = {};

  await Promise.all(
    fields
      .filter((field) => field.type === 'belongs-to' && field.relation)
      .map(async (field) => {
        const options = await loadBelongsToOptions(field);
        labels[field.name] = new Map(options.map((option) => [String(option.value), option.label]));
      }),
  );

  return labels;
}

export async function buildFormRelations(
  fields: AdminField[],
): Promise<Record<string, RelationOption[]>> {
  const relations: Record<string, RelationOption[]> = {};

  await Promise.all(
    fields
      .filter((field) => field.type === 'belongs-to' && field.relation)
      .map(async (field) => {
        relations[field.name] = await loadBelongsToOptions(field);
      }),
  );

  return relations;
}

export interface HasManyTableRow {
  cells: Array<{ name: string; label: string; value: string }>;
}

export interface HasManyTable {
  name: string;
  label: string;
  columns: Array<{ name: string; label: string }>;
  rows: HasManyTableRow[];
}

export async function loadHasManyTables(
  record: Model,
  sections: AdminHasManySection[],
): Promise<HasManyTable[]> {
  const tables: HasManyTable[] = [];

  for (const section of sections) {
    const relationMethod = (record as unknown as Record<string, unknown>)[section.name];
    if (typeof relationMethod !== 'function') {
      continue;
    }

    const relation = relationMethod.call(record) as { get: () => Promise<Model[]> };
    const models = await relation.get();
    tables.push({
      name: section.name,
      label: section.label ?? section.name,
      columns: section.columns.map((column) => ({
        name: column.name,
        label: column.label ?? column.name,
      })),
      rows: models.map((row) => ({
        cells: section.columns.map((column) => ({
          name: column.name,
          label: column.label ?? column.name,
          value: String(row.getAttribute(column.name as never) ?? ''),
        })),
      })),
    });
  }

  return tables;
}

export function displayFieldValue(
  field: AdminField,
  record: Model,
  relationLabels: Record<string, Map<string, string>>,
): string {
  const raw = record.getAttribute(field.name as never);
  if (field.type === 'boolean') {
    return raw ? 'Yes' : 'No';
  }

  if (field.type === 'belongs-to' && field.relation) {
    const labels = relationLabels[field.name];
    return labels?.get(String(raw)) ?? String(raw ?? '');
  }

  if (field.type === 'json') {
    return JSON.stringify(raw);
  }

  if (field.type === 'file') {
    return String(raw ?? '');
  }

  if (field.type === 'datetime' && raw) {
    return new Date(String(raw)).toLocaleString();
  }

  return String(raw ?? '');
}