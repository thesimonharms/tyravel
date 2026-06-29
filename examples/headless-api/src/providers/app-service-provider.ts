import { ServiceProvider } from '@pondoknusa/core';
import { AuthController } from '../controllers/AuthController.js';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('app.name', 'Pondoknusa');
    this.app.bind(AuthController, () => new AuthController(this.app));
  }
}
