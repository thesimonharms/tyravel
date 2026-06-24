import { resolveClientIp, resolveSecure } from './trusted-proxies.js';
import type { RouteParams } from './types.js';
import type { SessionContract } from './session-contract.js';

export class TyravelRequest {
  constructor(
    public readonly raw: Request,
    public readonly params: RouteParams = {},
    public readonly routeName?: string,
  ) {}

  session?: SessionContract;
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
    return this.params[name] ?? fallback;
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