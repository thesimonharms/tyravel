import {
  StorageManager,
  StorageRepository,
} from '@pondoknusa/storage';
import type { Application } from './application.js';

let storageApplication: Application | undefined;

export function setStorageApplication(app: Application): void {
  storageApplication = app;
}

function resolveStorage(): StorageRepository {
  if (!storageApplication) {
    throw new Error('Storage facade is not ready. Boot the application first.');
  }
  return storageApplication.make<StorageRepository>('storage');
}

export interface StorageFacade {
  put(path: string, contents: string | Buffer): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<boolean>;
  url(path: string): string;
  temporaryUrl(path: string, expiresInSeconds: number): Promise<string>;
  disk(name?: string): StorageRepository;
}

export const Storage: StorageFacade = {
  put: (path, contents) => resolveStorage().put(path, contents),
  get: (path) => resolveStorage().get(path),
  exists: (path) => resolveStorage().exists(path),
  delete: (path) => resolveStorage().delete(path),
  url: (path) => resolveStorage().url(path),
  temporaryUrl: (path, expiresInSeconds) =>
    resolveStorage().temporaryUrl(path, expiresInSeconds),
  disk: (name) => {
    if (!storageApplication) {
      throw new Error('Storage facade is not ready. Boot the application first.');
    }
    const manager = storageApplication.make(StorageManager);
    return new StorageRepository(manager, name);
  },
};