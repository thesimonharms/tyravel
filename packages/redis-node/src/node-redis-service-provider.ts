import { registerNodeRedisDriver } from './register.js';

export class NodeRedisServiceProvider {
  constructor(_app: unknown) {}

  register(): void {
    registerNodeRedisDriver();
  }
}