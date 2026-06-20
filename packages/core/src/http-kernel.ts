import { RouteNotFoundException } from '@tyravel/http';
import { Response } from '@tyravel/http';
import { ValidationException } from '@tyravel/validation';
import { AuthenticationException } from '@tyravel/auth';
import { InvalidCredentialsException } from '@tyravel/auth';
import { AuthorizationException } from '@tyravel/auth';
import { InvalidResetTokenException } from '@tyravel/auth';
import type { Application } from './application.js';

export class HttpKernel {
  constructor(private readonly app: Application) {}

  async handle(request: Request): Promise<Response> {
    try {
      return await this.app.router().dispatch(request);
    } catch (error) {
      if (error instanceof RouteNotFoundException) {
        return Response.json({ message: error.message }, { status: 404 });
      }

      if (error instanceof ValidationException) {
        const validationError = error as ValidationException;
        return Response.json(
          {
            message: validationError.message,
            errors: validationError.errors,
          },
          { status: 422 },
        );
      }

      if (error instanceof AuthenticationException) {
        return Response.json({ message: error.message }, { status: 401 });
      }

      if (error instanceof InvalidCredentialsException) {
        return Response.json({ message: error.message }, { status: 401 });
      }

      if (error instanceof AuthorizationException) {
        return Response.json({ message: error.message }, { status: 403 });
      }

      if (error instanceof InvalidResetTokenException) {
        return Response.json({ message: error.message }, { status: 422 });
      }

      console.error(error);
      return Response.json({ message: 'Server Error' }, { status: 500 });
    }
  }
}