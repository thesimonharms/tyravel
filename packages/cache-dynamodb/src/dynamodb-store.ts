import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import type { CacheStore } from '@pondoknusa/cache';

export interface DynamoDbStoreConfig {
  driver: 'dynamodb';
  table: string;
  region?: string;
  endpoint?: string;
  keyAttribute?: string;
  valueAttribute?: string;
  ttlAttribute?: string;
}

export class DynamoDbStore implements CacheStore {
  private readonly client: DynamoDBClient;
  private readonly keyAttribute: string;
  private readonly valueAttribute: string;
  private readonly ttlAttribute?: string;

  constructor(private readonly config: DynamoDbStoreConfig) {
    this.client = new DynamoDBClient({
      region: config.region ?? 'us-east-1',
      endpoint: config.endpoint,
    });
    this.keyAttribute = config.keyAttribute ?? 'cache_key';
    this.valueAttribute = config.valueAttribute ?? 'cache_value';
    this.ttlAttribute = config.ttlAttribute;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const response = await this.client.send(new GetItemCommand({
      TableName: this.config.table,
      Key: { [this.keyAttribute]: { S: key } },
    }));

    const item = response.Item;
    if (!item?.[this.valueAttribute]?.S) {
      return null;
    }

    const ttlValue = this.ttlAttribute ? item[this.ttlAttribute]?.N : undefined;
    if (ttlValue) {
      const expiresAt = Number(ttlValue);
      if (expiresAt <= Math.floor(Date.now() / 1000)) {
        await this.forget(key);
        return null;
      }
    }

    const raw = item[this.valueAttribute]?.S;
    return raw ? JSON.parse(raw) as T : null;
  }

  async put(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const item: Record<string, { S: string } | { N: string }> = {
      [this.keyAttribute]: { S: key },
      [this.valueAttribute]: { S: JSON.stringify(value) },
    };

    if (this.ttlAttribute && ttlSeconds && ttlSeconds > 0) {
      item[this.ttlAttribute] = { N: String(Math.floor(Date.now() / 1000) + ttlSeconds) };
    }

    await this.client.send(new PutItemCommand({
      TableName: this.config.table,
      Item: item,
    }));
  }

  async add(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (await this.has(key)) {
      return false;
    }
    await this.put(key, value, ttlSeconds);
    return true;
  }

  async forget(key: string): Promise<boolean> {
    await this.client.send(new DeleteItemCommand({
      TableName: this.config.table,
      Key: { [this.keyAttribute]: { S: key } },
    }));
    return true;
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async flush(): Promise<void> {
    const response = await this.client.send(new ScanCommand({
      TableName: this.config.table,
      ProjectionExpression: this.keyAttribute,
    }));

    for (const item of response.Items ?? []) {
      const key = item[this.keyAttribute]?.S;
      if (key) {
        await this.forget(key);
      }
    }
  }
}