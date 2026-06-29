import type { TemporaryUrlFilesystem } from '@pondoknusa/storage';
import type { SupabaseDiskConfig } from './types.js';

export class SupabaseDisk implements TemporaryUrlFilesystem {
  private readonly baseUrl: string;

  constructor(private readonly config: SupabaseDiskConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '');
  }

  async put(path: string, contents: string | Buffer): Promise<void> {
    const key = this.normalizeKey(path);
    const body = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    const response = await fetch(this.objectUrl(key), {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'content-type': 'application/octet-stream',
        'x-upsert': 'true',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }
  }

  async get(path: string): Promise<Buffer | null> {
    const response = await fetch(this.objectUrl(this.normalizeKey(path)), {
      headers: this.authHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async exists(path: string): Promise<boolean> {
    const response = await fetch(this.objectUrl(this.normalizeKey(path)), {
      method: 'HEAD',
      headers: this.authHeaders(),
    });

    if (response.status === 404) {
      return false;
    }

    return response.ok;
  }

  async delete(path: string): Promise<boolean> {
    const response = await fetch(this.objectUrl(this.normalizeKey(path)), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    return response.ok;
  }

  url(path: string): string {
    const key = this.normalizeKey(path);
    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/+$/, '')}/${key}`;
    }
    return `${this.baseUrl}/storage/v1/object/public/${this.config.bucket}/${this.encodePath(key)}`;
  }

  async temporaryUrl(path: string, expiresInSeconds: number): Promise<string> {
    const key = this.normalizeKey(path);
    const response = await fetch(this.signUrl(key), {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    const payload = (await response.json()) as { signedURL?: string };
    if (!payload.signedURL) {
      throw new Error('Supabase did not return a signed URL.');
    }

    return this.resolveSignedUrl(payload.signedURL);
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.key}`,
      apikey: this.config.key,
    };
  }

  private objectUrl(path: string): string {
    return `${this.baseUrl}/storage/v1/object/${this.config.bucket}/${this.encodePath(path)}`;
  }

  private signUrl(path: string): string {
    return `${this.baseUrl}/storage/v1/object/sign/${this.config.bucket}/${this.encodePath(path)}`;
  }

  private resolveSignedUrl(signedUrl: string): string {
    if (signedUrl.startsWith('http://') || signedUrl.startsWith('https://')) {
      return signedUrl;
    }

    return `${this.baseUrl}${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}`;
  }

  private encodePath(path: string): string {
    return path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private normalizeKey(path: string): string {
    return path.replace(/^\/+/, '');
  }

  private async readError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      return payload.message ?? payload.error ?? `Supabase storage error (${response.status})`;
    } catch {
      return `Supabase storage error (${response.status})`;
    }
  }
}