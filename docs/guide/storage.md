# Storage

Register `StorageServiceProvider` and add `config/storage.ts`:

```typescript
export default {
  default: 'local',
  disks: {
    local: {
      driver: 'local',
      root: storage_path('app'),
    },
    public: {
      driver: 'local',
      root: public_path('storage'),
    },
  },
} as const;
```

## Using the Storage facade

```typescript
import { Storage } from '@tyravel/core';

// Write a file
await Storage.put('avatars/ada.png', imageBuffer);

// Read a file — returns Buffer or null
const data = await Storage.get('reports/summary.csv');

// Check existence
const exists = await Storage.exists('avatars/ada.png');

// Delete a file
await Storage.delete('temp/old-file.txt');

// Get a public URL
const url = Storage.url('avatars/ada.png');
// => /avatars/ada.png
```

## Multiple disks

Configure multiple disks and switch between them:

```typescript
export default {
  default: 'local',
  disks: {
    local: { driver: 'local', root: storage_path('app') },
    public: { driver: 'local', root: public_path('storage') },
    photos: { driver: 'local', root: '/mnt/photos' },
  },
} as const;
```

Use a specific disk:

```typescript
// Using the facade
const url = Storage.disk('public').url('avatars/ada.png');

// Or via StorageManager directly
import { StorageManager } from '@tyravel/storage';

const manager = app.make(StorageManager);
const disk = manager.disk('photos');
await disk.put('2025/sunset.jpg', buffer);
```

## Cloudflare R2

R2 is S3-compatible object storage with no egress fees to Cloudflare Workers (useful for future edge work). Tyravel ships `@tyravel/storage-r2`:

```bash
npm install @tyravel/storage-r2
```

```typescript
// config/storage.ts
import { env } from '@tyravel/config';

export default {
  default: 'r2',
  disks: {
    r2: {
      driver: 'r2',
      bucket: env('R2_BUCKET', 'tyravel'),
      endpoint: env('R2_ENDPOINT'),
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      publicUrl: env('R2_PUBLIC_URL'),
    },
  },
} as const;
```

```typescript
import { R2StorageServiceProvider } from '@tyravel/storage-r2';

app.register(R2StorageServiceProvider);
```

Uploads run from your **Node origin**; R2 does not require Workers. Pair with [Cloudflare deployment](/guide/deployment/cloudflare) for CDN in front of the same app.

See [@tyravel/storage-r2](/reference/generated/packages/storage-r2) for config keys.

## Cloudflare R2

First-party driver for S3-compatible R2 buckets. Uploads run from your Node origin; no Workers required.

```bash
npm install @tyravel/storage-r2
```

```typescript
import { R2StorageServiceProvider } from '@tyravel/storage-r2';

app.register(R2StorageServiceProvider);
```

```typescript
// config/storage.ts
export default {
  default: 'r2',
  disks: {
    r2: {
      driver: 'r2',
      bucket: env('R2_BUCKET', 'tyravel'),
      endpoint: env('R2_ENDPOINT'),
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      publicUrl: env('R2_PUBLIC_URL'),
    },
  },
} satisfies StorageConfig;
```

Pair with [Cloudflare deployment](/guide/deployment/cloudflare) for CDN + storage on the same ecosystem. See [@tyravel/storage-r2](/reference/generated/packages/storage-r2) for all config keys.

## Custom drivers

Register custom storage drivers with `StorageManager.extend()`:

```typescript
import { StorageManager, type Filesystem, type DiskConfig } from '@tyravel/storage';

class S3Disk implements Filesystem {
  constructor(private config: DiskConfig) {}
  async put(path: string, contents: string | Buffer): Promise<void> {
    // upload to S3
  }
  async get(path: string): Promise<Buffer | null> {
    // download from S3
  }
  async exists(path: string): Promise<boolean> {
    // check S3
  }
  async delete(path: string): Promise<boolean> {
    // delete from S3
  }
  url(path: string): string {
    return `https://${this.config.bucket}.s3.amazonaws.com/${path}`;
  }
}

StorageManager.extend('s3', (config) => new S3Disk(config));
```

Then use it in `config/storage.ts`:

```typescript
s3: {
  driver: 's3',
  bucket: 'my-app',
  region: 'us-east-1',
},
```

## Filesystem interface

Every driver implements the `Filesystem` interface:

```typescript
interface Filesystem {
  put(path: string, contents: string | Buffer): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<boolean>;
  url(path: string): string;
}
```

## Service provider registration

```typescript
import { StorageServiceProvider } from '@tyravel/core';

app.register(StorageServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setStorageApplication } from '@tyravel/core';

setStorageApplication(app);
```