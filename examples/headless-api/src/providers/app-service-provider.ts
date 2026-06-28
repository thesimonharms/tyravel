import { ServiceProvider } from '@tyravel/core';
import { AuthController } from '../controllers/AuthController.js';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('app.name', 'Tyravel');
    this.app.bind(AuthController, () => new AuthController(this.app));
  }
}
