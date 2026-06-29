import type { AuthManager, Gate } from '@pondoknusa/auth';
import { Model } from '@pondoknusa/database';
import type { ModelStatic } from '@pondoknusa/database';
import { NotFoundHttpException } from '@pondoknusa/http';
import type { PondoknusaRequest } from '@pondoknusa/http';
import { Response } from '@pondoknusa/http';
import type { ViewEngine } from '@pondoknusa/views';
import type { AdminResource } from './admin-resource.js';
import type { AdminRegistry } from './admin-registry.js';
import { buildAuditChanges } from './audit-diff.js';
import type { AdminAuditLogger } from './audit-log.js';
import { authorizeResourceAbility } from './authorize.js';
import { buildDashboardStats, type AdminDashboardDependencies } from './dashboard.js';
import { parseAdminInput, parseBulkIds } from './form-data.js';
import type { StorageLike } from './file-upload.js';
import { applyAdminFilters, applyAdminSearch, resolveAdminSort } from './query.js';
import {
  buildFormRelations,
  buildRelationLabels,
  displayFieldValue,
  loadHasManyTables,
} from './relations.js';
import { renderAdminView } from './render.js';
import type { AdminConfig, AdminField } from './types.js';

export interface AdminControllerDependencies {
  registry: AdminRegistry;
  view: ViewEngine;
  gate: Gate;
  auth: AuthManager;
  config: AdminConfig;
  dashboard?: AdminDashboardDependencies;
  storage?: StorageLike;
  audit?: AdminAuditLogger;
}

interface IndexRow {
  id: string | number;
  cells: Array<{ name: string; label: string; value: string }>;
}

export class AdminController {
  constructor(private readonly deps: AdminControllerDependencies) {}

  async dashboard(_request: PondoknusaRequest) {
    const resources = this.deps.registry.all();
    const stats = await buildDashboardStats(
      resources.map((resource) => ({
        key: resource.key,
        label: resource.label,
        model: resource.model,
      })),
      this.deps.dashboard ?? {},
    );

    const html = await renderAdminView(this.deps.view, 'dashboard', {
      ...this.sharedContext(),
      stats,
      healthChecks: Object.entries(stats.healthChecks).map(([name, result]) => ({
        name,
        ok: result.ok,
        error: result.error,
      })),
    });

    return Response.html(html);
  }

  async index(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    await this.authorize(resource, resource.abilities.viewAny);

    const page = Number(request.query('page') ?? 1);
    const perPage = resource.perPage ?? this.deps.config.perPage ?? 15;
    const search = request.query('search');
    const sort = resolveAdminSort(resource, request);

    let builder = resource.model.query().orderBy(sort.column, sort.direction);
    builder = applyAdminSearch(builder, resource, search);
    builder = applyAdminFilters(builder, resource, request);

    const paginator = await builder.paginateModels(perPage, page);
    const relationLabels = await buildRelationLabels(resource.indexFields());
    const rows: IndexRow[] = paginator.items.map((record: Model) => ({
      id: this.recordId(resource, record),
      cells: resource.indexFields().map((field) => ({
        name: field.name,
        label: field.label ?? field.name,
        value: displayFieldValue(field, record, relationLabels),
      })),
    }));

    const html = await renderAdminView(this.deps.view, 'index', {
      ...this.sharedContext(resource),
      rows,
      columns: resource.indexFields().map((field) => ({
        name: field.name,
        label: field.label ?? field.name,
      })),
      paginator: paginator.toJSON(),
      search: search ?? '',
      sort,
      filters: this.activeFilters(resource, request),
    });

    return Response.html(html);
  }

  async show(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    const record = await this.findRecord(resource, this.param(request, 'id'));
    await this.authorize(resource, resource.abilities.view, record);

    const relationLabels = await buildRelationLabels(resource.fields);
    const fields = resource.fields.map((field) => ({
      name: field.name,
      label: field.label ?? field.name,
      value: displayFieldValue(field, record, relationLabels),
    }));

    const html = await renderAdminView(this.deps.view, 'show', {
      ...this.sharedContext(resource),
      record,
      recordId: this.recordId(resource, record),
      fields,
      hasMany: await loadHasManyTables(record, resource.hasMany),
      auditLog: this.formatAuditLog(resource.key, this.recordId(resource, record)),
    });

    return Response.html(html);
  }

  async create(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    await this.authorize(resource, resource.abilities.create);

    const formFields = resource.formFields();
    const fields = await this.buildFormFieldContext(formFields, {});
    const html = await renderAdminView(this.deps.view, 'form', {
      ...this.sharedContext(resource),
      mode: 'create',
      fields,
      hasMany: [],
      hasFileFields: fields.some((field) => field.type === 'file'),
      action: this.adminPath(`/${resource.key}`),
    });

    return Response.html(html);
  }

  async store(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    await this.authorize(resource, resource.abilities.create);

    const formFields = resource.formFields();
    const attributes = await parseAdminInput(request, formFields, this.deps.storage);
    const record = await this.createRecord(resource.model, attributes);

    await this.recordAudit(request, resource.key, this.recordId(resource, record), 'create', attributes);

    return Response.redirect(this.adminPath(`/${resource.key}/${this.recordId(resource, record)}`));
  }

  async edit(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    const record = await this.findRecord(resource, this.param(request, 'id'));
    await this.authorize(resource, resource.abilities.update, record);

    const formFields = resource.formFields();
    const fields = await this.buildFormFieldContext(formFields, record);
    const html = await renderAdminView(this.deps.view, 'form', {
      ...this.sharedContext(resource),
      mode: 'edit',
      recordId: this.recordId(resource, record),
      fields,
      hasMany: await loadHasManyTables(record, resource.hasMany),
      hasFileFields: fields.some((field) => field.type === 'file'),
      action: this.adminPath(`/${resource.key}/${this.recordId(resource, record)}`),
    });

    return Response.html(html);
  }

  async update(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    const record = await this.findRecord(resource, this.param(request, 'id'));
    await this.authorize(resource, resource.abilities.update, record);

    const formFields = resource.formFields();
    const attributes = await parseAdminInput(request, formFields, this.deps.storage);
    const changes = buildAuditChanges(formFields, record, attributes);
    await record.update(attributes);

    await this.recordAudit(
      request,
      resource.key,
      this.recordId(resource, record),
      'update',
      changes,
    );

    return Response.redirect(this.adminPath(`/${resource.key}/${this.recordId(resource, record)}`));
  }

  async destroy(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    const record = await this.findRecord(resource, this.param(request, 'id'));
    await this.authorize(resource, resource.abilities.delete, record);

    const recordId = this.recordId(resource, record);
    await record.delete();

    await this.recordAudit(request, resource.key, recordId, 'delete', {});

    return Response.redirect(this.adminPath(`/${resource.key}`));
  }

  async bulk(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    await this.authorize(resource, resource.abilities.delete);

    const body = await parseAdminInput(request, []);
    const ids = parseBulkIds(request, body);

    for (const id of ids) {
      const record = await this.findOptionalRecord(resource.model, id);
      if (!record) {
        continue;
      }

      await this.authorize(resource, resource.abilities.delete, record);
      const recordId = this.recordId(resource, record);
      await record.delete();
      await this.recordAudit(request, resource.key, recordId, 'delete', {});
    }

    const query = ids.length > 0 ? `?deleted=${ids.length}` : '';
    return Response.redirect(`${this.adminPath(`/${resource.key}`)}${query}`);
  }

  async bulkExport(request: PondoknusaRequest) {
    const resource = this.resolveResource(request);
    await this.authorize(resource, resource.abilities.viewAny);

    const body = await parseAdminInput(request, []);
    const ids = parseBulkIds(request, body);
    const columns = resource.indexFields();
    const header = columns.map((field) => field.label ?? field.name).join(',');
    const lines = [header];

    for (const id of ids) {
      const record = await this.findOptionalRecord(resource.model, id);
      if (!record) {
        continue;
      }

      await this.authorize(resource, resource.abilities.view, record);
      const relationLabels = await buildRelationLabels(columns);
      const row = columns
        .map((field) => csvEscape(displayFieldValue(field, record, relationLabels)))
        .join(',');
      lines.push(row);
    }

    return Response.make(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${resource.key}.csv"`,
      },
    });
  }

  private param(request: PondoknusaRequest, name: string): string {
    const value = request.param(name);
    if (!value) {
      throw new NotFoundHttpException();
    }
    return value;
  }

  private resolveResource(request: PondoknusaRequest): AdminResource {
    const key = this.param(request, 'resource');
    const resource = this.deps.registry.get(key);
    if (!resource) {
      throw new NotFoundHttpException(`Admin resource "${key}" was not found.`);
    }
    return resource;
  }

  private async findRecord(resource: AdminResource, id: string): Promise<Model> {
    const record = await this.findOptionalRecord(resource.model, id);
    if (!record) {
      throw new NotFoundHttpException();
    }
    return record;
  }

  private async findOptionalRecord(
    model: ModelStatic,
    id: string | number,
  ): Promise<Model | null> {
    const record = await model.find(id);
    return record ? (record as Model) : null;
  }

  private async createRecord(
    model: ModelStatic,
    attributes: Record<string, unknown>,
  ): Promise<Model> {
    const ModelClass = model as ModelStatic & {
      create(attributes: Record<string, unknown>): Promise<Model>;
    };
    return ModelClass.create(attributes);
  }

  private async authorize(
    resource: AdminResource,
    ability: string,
    record?: unknown,
  ): Promise<void> {
    await authorizeResourceAbility(
      this.deps.gate,
      this.deps.auth,
      resource,
      ability,
      record,
    );
  }

  private recordId(resource: AdminResource, record: Model): string | number {
    const primaryKey = (resource.model as { primaryKey?: string }).primaryKey ?? 'id';
    return record.getAttribute(primaryKey as never) as string | number;
  }

  private adminPath(path = ''): string {
    const prefix = (this.deps.config.prefix ?? '/admin').replace(/\/$/, '');
    if (!path) {
      return prefix || '/';
    }
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private sharedContext(resource?: AdminResource): Record<string, unknown> {
    return {
      resources: this.deps.registry.all().map((entry) => ({
        key: entry.key,
        label: entry.label,
      })),
      resource: resource
        ? {
            key: resource.key,
            label: resource.label,
          }
        : undefined,
      prefix: this.adminPath(),
    };
  }

  private async buildFormFieldContext(
    fields: AdminField[],
    record: Model | Record<string, unknown>,
  ): Promise<
    Array<{
      name: string;
      label: string;
      type: string;
      value: string;
      checked: boolean;
      options: Array<{ value: string | number; label: string }>;
    }>
  > {
    const relations = await buildFormRelations(fields);

    return fields.map((field) => {
      const raw =
        record instanceof Model
          ? record.getAttribute(field.name as never)
          : record[field.name];
      const value = this.serializeFormValue(field, raw);

      return {
        name: field.name,
        label: field.label ?? field.name,
        type: field.type ?? 'text',
        value,
        checked: field.type === 'boolean' && Boolean(raw),
        options: relations[field.name] ?? [],
      };
    });
  }

  private serializeFormValue(field: AdminField, raw: unknown): string {
    if (raw === undefined || raw === null) {
      return '';
    }

    if (field.type === 'json') {
      return typeof raw === 'string' ? raw : JSON.stringify(raw);
    }

    if (field.type === 'datetime') {
      const date = new Date(String(raw));
      if (Number.isNaN(date.getTime())) {
        return String(raw);
      }
      return date.toISOString().slice(0, 16);
    }

    return String(raw);
  }

  private async recordAudit(
    request: PondoknusaRequest,
    resourceKey: string,
    recordId: string | number,
    action: 'create' | 'update' | 'delete',
    changes: Record<string, unknown> | Record<string, { before?: unknown; after?: unknown }>,
  ): Promise<void> {
    if (!this.deps.audit || this.deps.config.auditLog?.enabled === false) {
      return;
    }

    const actor = this.resolveActor(request);
    const normalized =
      action === 'create'
        ? Object.fromEntries(
            Object.entries(changes as Record<string, unknown>).map(([key, value]) => [
              key,
              { after: value },
            ]),
          )
        : (changes as Record<string, { before?: unknown; after?: unknown }>);

    await this.deps.audit.record({
      resourceKey,
      recordId,
      action,
      actorId: actor.actorId,
      actorLabel: actor.actorLabel,
      changes: normalized,
    });
  }

  private formatAuditLog(resourceKey: string, recordId: string | number) {
    return (this.deps.audit?.forRecord(resourceKey, recordId) ?? []).map((entry) => ({
      action: entry.action,
      actorLabel: entry.actorLabel ?? 'unknown',
      occurredAt: new Date(entry.timestamp).toLocaleString(),
    }));
  }

  private resolveActor(request: PondoknusaRequest): {
    actorId?: string | number;
    actorLabel?: string;
  } {
    const user = request.user as
      | {
          getAuthIdentifier?: () => string | number;
          email?: string;
          name?: string;
        }
      | null
      | undefined;

    if (!user) {
      return {};
    }

    return {
      actorId: user.getAuthIdentifier?.(),
      actorLabel: user.email ?? user.name ?? String(user.getAuthIdentifier?.() ?? 'unknown'),
    };
  }

  private activeFilters(
    resource: AdminResource,
    request: PondoknusaRequest,
  ): Array<{
    name: string;
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
  }> {
    return resource.filters.map((filter) => ({
      name: filter.name,
      label: filter.label ?? filter.name,
      value: request.query(`filter_${filter.name}`) ?? '',
      options: filter.options
        ? Object.entries(filter.options).map(([value, label]) => ({ value, label }))
        : [],
    }));
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}