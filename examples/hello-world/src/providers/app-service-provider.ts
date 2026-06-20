import { ServiceProvider } from '@tyravel/core';
import { ConfigRepository } from '@tyravel/config';
import { AuthController } from '../controllers/auth-controller.js';
import { UserController } from '../controllers/user-controller.js';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.bind(AuthController, () => new AuthController(this.app));
    this.app.bind(UserController, () => new UserController());

    this.app.middleware('json', async (_request, next) => {
      const response = await next();
      response.headers.set('x-tyravel-api', '1');
      return response;
    });
  }

  override boot() {
    const config = this.app.make<ConfigRepository>('config');
    if (config.get<boolean>('app.debug')) {
      console.log(`Booted ${config.get<string>('app.name')}`);
    }
  }
}