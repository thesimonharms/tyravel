import { registerAwsS3StorageDriver } from './register.js';

export class AwsS3StorageServiceProvider {
  constructor(_app: unknown) {}

  register(): void {
    registerAwsS3StorageDriver();
  }
}