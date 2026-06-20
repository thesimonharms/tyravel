/**
 * Base class for HTTP exceptions that carry a status code and optional headers.
 *
 * Throw these from controllers or middleware to short-circuit the request
 * with a specific response — the exception handler maps them automatically.
 */
export class HttpException extends Error {
  readonly status: number;
  readonly headers: Headers;

  constructor(
    message: string,
    status = 500,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'HttpException';
    this.status = status;
    this.headers = new Headers(headers);
  }
}

export class MethodNotAllowedException extends HttpException {
  readonly allowedMethods: string[];

  constructor(method: string, path: string, allowedMethods: string[]) {
    super(`Method ${method} is not allowed for ${path}.`, 405, {
      allow: allowedMethods.join(', '),
    });
    this.name = 'MethodNotAllowedException';
    this.allowedMethods = allowedMethods;
  }
}

export class NotFoundHttpException extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundHttpException';
  }
}
