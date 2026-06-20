import { registerAuthRoutes } from './auth.js';
import { registerWebRoutes } from './web.js';

export function registerRoutes(): void {
  registerWebRoutes();
  registerAuthRoutes();
}