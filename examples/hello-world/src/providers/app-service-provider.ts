import { ServiceProvider } from '@pondoknusa/core';
import { ConfigRepository } from '@pondoknusa/config';
import { setSmsTransport } from '@pondoknusa/notifications';
import { AuthController } from '../controllers/auth-controller.js';
import { UserController } from '../controllers/user-controller.js';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.bind(AuthController, () => new AuthController(this.app));
    this.app.bind(UserController, () => new UserController());

    this.app.middleware('json', async (_request, next) => {
      const response = await next();
      response.headers.set('x-pondoknusa-api', '1');
      return response;
    });
  }

  override boot() {
    setSmsTransport(async (message) => {
      console.log(`[sms] ${message.from ?? 'Pondoknusa'} → ${message.to}: ${message.body}`);
    });

    const config = this.app.make<ConfigRepository>('config');
    if (config.get<boolean>('app.debug')) {
      console.log(`Booted ${config.get<string>('app.name')}`);
    }
  }
}