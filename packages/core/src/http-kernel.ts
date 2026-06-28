import { ExceptionHandler } from './exception-handler.js';
import type { Application } from './application.js';

export class HttpKernel {
  private readonly handler: ExceptionHandler;

  constructor(private readonly app: Application) {
    this.handler = new ExceptionHandler(app);
  }

  async handle(request: Request): Promise<Response> {
    try {
      const pathname = new URL(request.url).pathname;
      await this.app.bootLazyProvidersForRequest(pathname);
      return await this.app.router().dispatch(request, pathname);
    } catch (error) {
      return this.handler.render(error, request);
    }
  }
}
