import type { PolicyConstructor } from '@pondoknusa/auth';
import type { ModelStatic } from '@pondoknusa/database';

export type AdminFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'json'
  | 'file'
  | 'belongs-to';

export interface AdminBelongsToField {
  model: ModelStatic;
  displayColumn: string;
  foreignKey?: string;
}

export interface AdminFileField {
  disk?: string;
  directory?: string;
}

export interface AdminField {
  name: string;
  label?: string;
  type?: AdminFieldType;
  searchable?: boolean;
  sortable?: boolean;
  relation?: AdminBelongsToField;
  file?: AdminFileField;
}

export interface AdminFilter {
  name: string;
  column: string;
  label?: string;
  options?: Record<string, string>;
}

export interface AdminAbilities {
  viewAny?: string;
  view?: string;
  create?: string;
  update?: string;
  delete?: string;
}

export interface AdminHasManyColumn {
  name: string;
  label?: string;
}

export interface AdminHasManySection {
  name: string;
  label?: string;
  columns: AdminHasManyColumn[];
}

export interface AdminResourceOptions {
  label?: string;
  fields: AdminField[];
  searchable?: string[];
  filters?: AdminFilter[];
  hasMany?: AdminHasManySection[];
  policy?: PolicyConstructor;
  abilities?: AdminAbilities;
  perPage?: number;
}

export interface AdminAuditConfig {
  enabled?: boolean;
  maxEntries?: number;
  persistPath?: string;
}

export interface AdminConfig {
  enabled?: boolean;
  prefix?: string;
  middleware?: string[];
  accessAbility?: string;
  accessPolicyModel?: ModelStatic;
  perPage?: number;
  auditLog?: AdminAuditConfig;
  storageDisk?: string;
}