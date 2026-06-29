import type { ModelStatic } from '@pondoknusa/database';
import type {
  AdminAbilities,
  AdminField,
  AdminFilter,
  AdminHasManySection,
  AdminResourceOptions,
} from './types.js';

const DEFAULT_ABILITIES: Required<AdminAbilities> = {
  viewAny: 'viewAny',
  view: 'view',
  create: 'create',
  update: 'update',
  delete: 'delete',
};

export class AdminResource {
  readonly label: string;
  readonly fields: AdminField[];
  readonly searchable: string[];
  readonly filters: AdminFilter[];
  readonly abilities: Required<AdminAbilities>;
  readonly perPage: number;
  readonly hasMany: AdminHasManySection[];

  constructor(
    public readonly key: string,
    public readonly model: ModelStatic,
    options: AdminResourceOptions,
  ) {
    this.label = options.label ?? titleCase(key);
    this.fields = options.fields;
    this.searchable = options.searchable ?? options.fields
      .filter((field) => field.searchable)
      .map((field) => field.name);
    this.filters = options.filters ?? [];
    this.abilities = { ...DEFAULT_ABILITIES, ...options.abilities };
    this.perPage = options.perPage ?? 15;
    this.hasMany = options.hasMany ?? [];
    if (options.policy) {
      this.policy = options.policy;
    }
  }

  policy?: AdminResourceOptions['policy'];

  formFields(): AdminField[] {
    const model = this.model as { primaryKey?: string };
    const primaryKey = model.primaryKey ?? 'id';
    return this.fields.filter((field) => field.name !== primaryKey);
  }

  indexFields(): AdminField[] {
    return this.fields;
  }
}

export function defineAdminResource(
  key: string,
  model: ModelStatic,
  options: AdminResourceOptions,
): AdminResource {
  return new AdminResource(key, model, options);
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}