import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Filesystem } from '@tyravel/storage';
import type { S3DiskConfig } from './types.js';

export class S3Disk implements Filesystem {
  private readonly client: S3Client;

  constructor(private readonly config: S3DiskConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret,
      },
      forcePathStyle: Boolean(config.endpoint),
    });
  }

  async put(path: string, contents: string | Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: this.normalizeKey(path),
        Body: contents,
      }),
    );
  }

  async get(path: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: this.normalizeKey(path),
        }),
      );
      if (!response.Body) {
        return null;
      }
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: this.normalizeKey(path),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: this.normalizeKey(path),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  url(path: string): string {
    const key = this.normalizeKey(path);
    if (this.config.url) {
      return `${this.config.url.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  private normalizeKey(path: string): string {
    return path.replace(/^\/+/, '');
  }
}