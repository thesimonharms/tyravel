import type { PondoknusaRequest } from './request.js';

export type ResourcePayload = Record<string, unknown>;

export interface PaginatorLike {
  items: unknown[];
  toArray(): ResourcePayload & { data: unknown[] };
}

export function isPaginatorLike(value: unknown): value is PaginatorLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as PaginatorLike;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.toArray === 'function'
  );
}

export type ConditionalValue<T> = T | null | undefined | false;

export abstract class JsonResource<T = unknown> {
  static wrap: string | null = 'data';

  constructor(protected readonly resource: T) {}

  protected when(
    condition: unknown,
    value: ResourcePayload | (() => ResourcePayload),
  ): ResourcePayload | undefined {
    if (!condition) {
      return undefined;
    }

    return typeof value === 'function' ? value() : value;
  }

  protected whenLoaded(
    relation: string,
    value: ResourcePayload | (() => ResourcePayload),
  ): ResourcePayload | undefined {
    const model = this.resource as { relationLoaded?: (name: string) => boolean };
    if (typeof model?.relationLoaded !== 'function' || !model.relationLoaded(relation)) {
      return undefined;
    }

    return typeof value === 'function' ? value() : value;
  }

  protected mergeWhen(
    condition: unknown,
    value: ResourcePayload,
  ): ResourcePayload {
    if (!condition) {
      return {};
    }

    return value;
  }

  static make<TResource extends JsonResource>(
    this: new (resource: never) => TResource,
    resource: unknown,
  ): TResource {
    return new (this as new (resource: unknown) => TResource)(resource);
  }

  static collection<TResource extends JsonResource>(
    this: new (resource: never) => TResource,
    resources: unknown,
  ): ResourceCollection<TResource> {
    return new ResourceCollection(
      this as new (resource: unknown) => TResource,
      resources,
    );
  }

  abstract toArray(request?: PondoknusaRequest): ResourcePayload | Promise<ResourcePayload>;

  async resolve(request?: PondoknusaRequest): Promise<ResourcePayload> {
    const payload = await this.toArray(request);
    const wrap = (this.constructor as typeof JsonResource).wrap;

    if (wrap) {
      return { [wrap]: payload };
    }

    return payload;
  }
}

export class ResourceCollection<TResource extends JsonResource = JsonResource> {
  static wrap: string | null = 'data';

  constructor(
    private readonly resourceClass: new (resource: unknown) => TResource,
    private readonly collection: unknown,
  ) {}

  async resolve(request?: PondoknusaRequest): Promise<ResourcePayload> {
    if (isPaginatorLike(this.collection)) {
      const page = this.collection.toArray();
      const data = await this.transformItems(page.data, request);

      return {
        ...page,
        data,
      };
    }

    const items = Array.isArray(this.collection)
      ? this.collection
      : this.collection && typeof this.collection === 'object' && 'items' in this.collection
        ? (this.collection as { items: unknown[] }).items
        : [];

    const data = await this.transformItems(items, request);
    const wrap = (this.constructor as typeof ResourceCollection).wrap;

    if (wrap) {
      return { [wrap]: data };
    }

    return { data };
  }

  private async transformItems(
    items: unknown[],
    request?: PondoknusaRequest,
  ): Promise<ResourcePayload[]> {
    return Promise.all(
      items.map(async (item) => new this.resourceClass(item).toArray(request)),
    );
  }
}

export function isJsonResource(value: unknown): value is JsonResource {
  return value instanceof JsonResource;
}

export function isResourceCollection(value: unknown): value is ResourceCollection {
  return value instanceof ResourceCollection;
}