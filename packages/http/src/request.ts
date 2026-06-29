import { resolveClientIp, resolveSecure } from './trusted-proxies.js';
import type { RouteParamValue, RouteParams } from './types.js';
import type { SessionContract } from './session-contract.js';

export class PondoknusaRequest {
  private _raw: Request;
  private _params: RouteParams;
  private _routeName?: string;

  constructor(raw: Request, params: RouteParams = {}, routeName?: string) {
    this._raw = raw;
    this._params = params;
    this._routeName = routeName;
  }

  get raw(): Request {
    return this._raw;
  }

  get params(): RouteParams {
    return this._params;
  }

  get routeName(): string | undefined {
    return this._routeName;
  }

  reinitialize(raw: Request, params: RouteParams, routeName?: string): void {
    this._raw = raw;
    this._params = params;
    this._routeName = routeName;
    this.resetMutableState();
  }

  resetMutableState(): void {
    this.session = undefined;
    this.locale = undefined;
    this.user = null;
    this.tokenAbilities = undefined;
    this.tokenId = undefined;
    this.remoteAddress = undefined;
    this.trustedProxies = [];
    this.cachedFormData = undefined;
  }

  private cachedFormData?: FormData;

  setFormBodyCache(data: FormData): void {
    this.cachedFormData = data;
  }

  getFormBodyCache(): FormData | undefined {
    return this.cachedFormData;
  }

  session?: SessionContract;
  locale?: string;
  user: unknown = null;
  tokenAbilities?: string[];
  tokenId?: number;
  remoteAddress?: string;
  private trustedProxies: string[] = [];

  get method(): string {
    return this.raw.method;
  }

  get url(): URL {
    return new URL(this.raw.url);
  }

  get path(): string {
    return this.url.pathname;
  }

  get headers(): Headers {
    return this.raw.headers;
  }

  param(name: string, fallback?: string): string | undefined {
    const value = this.params[name];
    if (value === undefined) {
      return fallback;
    }

    if (typeof value === 'string') {
      return value;
    }

    return this.routeKey(value) ?? fallback;
  }

  routeModel<T = unknown>(name: string): T | undefined {
    const value = this.params[name];
    if (value === undefined || typeof value === 'string') {
      return undefined;
    }

    return value as T;
  }

  private routeKey(value: RouteParamValue): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      if ('getKey' in value && typeof (value as { getKey: () => unknown }).getKey === 'function') {
        return String((value as { getKey: () => unknown }).getKey());
      }

      if (
        'getAttribute' in value &&
        typeof (value as { getAttribute: (key: string) => unknown }).getAttribute === 'function'
      ) {
        const model = value as {
          getAttribute: (key: string) => unknown;
          constructor?: { primaryKey?: string };
        };
        const primaryKey = model.constructor?.primaryKey ?? 'id';
        const id = model.getAttribute(primaryKey);
        if (id !== undefined && id !== null) {
          return String(id);
        }
      }
    }

    return undefined;
  }

  query(name: string, fallback?: string): string | undefined {
    return this.url.searchParams.get(name) ?? fallback;
  }

  page(name = 'page', fallback = 1): number {
    return this.resolvePositiveInt(this.query(name), fallback);
  }

  perPage(name = 'per_page', fallback = 15, max = 100): number {
    return Math.min(this.resolvePositiveInt(this.query(name), fallback), max);
  }

  private resolvePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  async json<T = unknown>(): Promise<T> {
    return this.raw.json() as Promise<T>;
  }

  async text(): Promise<string> {
    return this.raw.text();
  }

  async formData(): Promise<FormData> {
    if (this.cachedFormData) {
      return this.cachedFormData;
    }
    return this.raw.formData();
  }

  input<T = string>(key: string): Promise<T | undefined> {
    const contentType = this.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return this.json<Record<string, T>>().then((body) => body[key]);
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      return this.formData().then((body) => body.get(key) as T | undefined);
    }

    return Promise.resolve(undefined);
  }

  header(name: string, fallback?: string): string | undefined {
    return this.raw.headers.get(name) ?? fallback;
  }

  bearerToken(): string | undefined {
    const authorization = this.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.slice('Bearer '.length);
  }

  setTrustedProxies(proxies: string[]): void {
    this.trustedProxies = proxies;
  }

  hasTrustedProxies(): boolean {
    return this.trustedProxies.length > 0;
  }

  ip(): string {
    return resolveClientIp(this, this.remoteAddress);
  }

  secure(): boolean {
    return resolveSecure(this);
  }
}