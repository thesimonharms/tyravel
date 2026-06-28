import type { ConfigRepository } from '@tyravel/config';
import type { Response } from '@tyravel/http';
import {
  HttpException,
  MethodNotAllowedException,
  NotFoundHttpException,
  Response as ResponseFactory,
  RouteNotFoundException,
} from '@tyravel/http';
import type {
  AuthenticationException,
  AuthorizationException,
  InvalidCredentialsException,
  InvalidResetTokenException,
} from '@tyravel/auth';
import type { ValidationException } from '@tyravel/validation';
import type { Application } from './application.js';
import { isHeadlessApplication } from './boot-profile.js';

/**
 * Maps thrown errors to HTTP responses.
 *
 * - **API requests** (Accept: application/json) get a consistent JSON body:
 *   `{ message, status, errors?, exception?, file?, line?, trace? }`
 *   The debug fields are only included when `app.debug` is true.
 *
 * - **Web requests** get an HTML error page:
 *   - Debug mode: full stack trace with file/line highlighting
 *   - Production: a clean, generic error page
 *
 * Known exception types are mapped to their correct status codes
 * (404, 401, 403, 405, 422). Unknown errors produce 500.
 */
export class ExceptionHandler {
  constructor(private readonly app: Application) {}

  report(error: unknown): void {
    console.error(error);
  }

  async render(error: unknown, request: Request): Promise<Response> {
    const { status, message, errors } = this.mapError(error);
    const debug = this.isDebug();
    const wantsJson = this.wantsJson(request);

    // Forward Allow header for 405
    const headers: Record<string, string> = {};
    if (error instanceof MethodNotAllowedException) {
      headers.allow = error.allowedMethods.join(', ');
    }

    if (wantsJson) {
      return this.renderJson(error, message, status, errors, debug, headers);
    }

    return this.renderHtml(error, message, status, debug, headers);
  }

  // ── Error mapping ──────────────────────────────────────────

  private mapError(error: unknown): {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
  } {
    if (error instanceof HttpException) {
      return { status: error.status, message: error.message };
    }

    if (error instanceof RouteNotFoundException) {
      return { status: 404, message: error.message };
    }

    if (error instanceof NotFoundHttpException) {
      return { status: 404, message: error.message };
    }

    if (error instanceof MethodNotAllowedException) {
      return { status: 405, message: error.message };
    }

    // Auth exceptions — lazy import to avoid circular dep
    if (this.isAuthException(error)) {
      const authError = error as AuthenticationException | InvalidCredentialsException;
      return { status: 401, message: authError.message };
    }

    if (this.isAuthorizationException(error)) {
      const authzError = error as AuthorizationException;
      return { status: 403, message: authzError.message };
    }

    if (this.isResetTokenException(error)) {
      const resetError = error as InvalidResetTokenException;
      return { status: 422, message: resetError.message };
    }

    // Validation
    if (this.isValidationException(error)) {
      const validationError = error as ValidationException;
      return {
        status: 422,
        message: validationError.message,
        errors: validationError.errors,
      };
    }

    // Unknown
    if (error instanceof Error) {
      return {
        status: 500,
        message: this.isDebug() ? error.message : 'Server Error',
      };
    }

    return { status: 500, message: 'Server Error' };
  }

  // ── JSON rendering ─────────────────────────────────────────

  private renderJson(
    error: unknown,
    message: string,
    status: number,
    errors: Record<string, string[]> | undefined,
    debug: boolean,
    headers: Record<string, string>,
  ): Response {
    const body: Record<string, unknown> = { message, status };

    if (errors) {
      body.errors = errors;
    }

    if (debug && error instanceof Error) {
      body.exception = error.name;
      body.file = this.extractFile(error.stack);
      body.line = this.extractLine(error.stack);
      body.trace = this.formatTrace(error.stack);
    }

    return ResponseFactory.json(body, { status, headers });
  }

  // ── HTML rendering ─────────────────────────────────────────

  private renderHtml(
    error: unknown,
    message: string,
    status: number,
    debug: boolean,
    headers: Record<string, string>,
  ): Response {
    const title = `${status} ${this.statusText(status)}`;

    if (!debug) {
      return ResponseFactory.html(
        this.productionPage(title, message),
        { status, headers },
      );
    }

    const stack = error instanceof Error ? error.stack ?? '' : String(error);
    const exceptionName = error instanceof Error ? error.name : 'Error';

    return ResponseFactory.html(
      this.debugPage(title, message, exceptionName, stack),
      { status, headers },
    );
  }

  // ── Debug HTML page ────────────────────────────────────────

  private debugPage(
    title: string,
    message: string,
    exceptionName: string,
    stack: string,
  ): string {
    const frames = this.parseStack(stack);
    const traceHtml = frames
      .map((frame, i) => `
        <div class="frame">
          <div class="frame-header">
            <span class="frame-num">#${i}</span>
            <span class="frame-fn">${this.escape(frame.fn)}</span>
            <span class="frame-loc">${this.escape(frame.file)}:${frame.line}</span>
          </div>
        </div>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.escape(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e; color: #e0e0e0; padding: 2rem; line-height: 1.6;
    }
    .header { margin-bottom: 1.5rem; }
    .status { font-size: 2.5rem; font-weight: 700; color: #ff6b6b; }
    .message { font-size: 1.2rem; color: #ccc; margin-top: 0.5rem; }
    .exception {
      display: inline-block; background: #2d2d44; color: #ff9f43;
      padding: 0.25rem 0.75rem; border-radius: 4px; font-family: monospace;
      font-size: 0.9rem; margin-top: 0.75rem;
    }
    .trace { margin-top: 2rem; }
    .trace h2 { font-size: 1rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem; }
    .frame {
      background: #16213e; border-radius: 6px; margin-bottom: 0.5rem;
      overflow: hidden; border: 1px solid #2d2d44;
    }
    .frame-header { padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .frame-num { color: #54a0ff; font-family: monospace; font-weight: 600; min-width: 2rem; }
    .frame-fn { color: #5eead4; font-family: monospace; font-weight: 500; }
    .frame-loc { color: #6b7280; font-family: monospace; font-size: 0.85rem; margin-left: auto; }
    .raw { margin-top: 1.5rem; background: #0f0f23; border-radius: 6px; padding: 1rem; overflow-x: auto; }
    .raw pre { font-family: 'SF Mono', Monaco, monospace; font-size: 0.85rem; color: #a0a0a0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <div class="status">${this.escape(title)}</div>
    <div class="message">${this.escape(message)}</div>
    <span class="exception">${this.escape(exceptionName)}</span>
  </div>
  <div class="trace">
    <h2>Stack Trace</h2>
    ${traceHtml || '<p style="color:#666">No stack trace available.</p>'}
  </div>
  <div class="raw">
    <pre>${this.escape(stack)}</pre>
  </div>
</body>
</html>`;
  }

  private productionPage(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.escape(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5; color: #333; display: flex;
      align-items: center; justify-content: center; min-height: 100vh;
    }
    .card {
      background: #fff; border-radius: 12px; padding: 3rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08); text-align: center; max-width: 480px;
    }
    .status { font-size: 3rem; font-weight: 700; color: #e74c3c; }
    .message { font-size: 1.1rem; color: #666; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">${this.escape(title)}</div>
    <div class="message">${this.escape(message)}</div>
  </div>
</body>
</html>`;
  }

  // ── Helpers ────────────────────────────────────────────────

  private isDebug(): boolean {
    try {
      const config = this.app.make<ConfigRepository>('config');
      return config.get<boolean>('app.debug', false);
    } catch {
      return false;
    }
  }

  private wantsJson(request: Request): boolean {
    if (isHeadlessApplication(this.app)) {
      return true;
    }

    const accept = request.headers.get('accept') ?? '';
    const contentType = request.headers.get('content-type') ?? '';
    // Prefer Accept header, fall back to content-type
    if (accept.includes('application/json') || accept.includes('application/vnd.api+json')) {
      return true;
    }
    if (accept.includes('text/html')) {
      return false;
    }
    return contentType.includes('application/json');
  }

  private statusText(status: number): string {
    const texts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return texts[status] ?? 'Error';
  }

  private extractFile(stack?: string): string | undefined {
    if (!stack) return undefined;
    const match = stack.split('\n')[1]?.match(/\((.+?):\d+:\d+\)/);
    return match?.[1];
  }

  private extractLine(stack?: string): number | undefined {
    if (!stack) return undefined;
    const match = stack.split('\n')[1]?.match(/:(\d+):\d+\)/);
    return match?.[1] ? Number(match[1]) : undefined;
  }

  private formatTrace(stack?: string): string[] {
    if (!stack) return [];
    return stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private parseStack(stack: string): { fn: string; file: string; line: number }[] {
    const frames: { fn: string; file: string; line: number }[] = [];
    for (const line of stack.split('\n').slice(1)) {
      const match = line.trim().match(/at (.+?) \((.+?):(\d+):\d+\)/);
      if (match) {
        frames.push({
          fn: match[1] ?? '<anonymous>',
          file: match[2] ?? '',
          line: Number(match[3] ?? 0),
        });
      } else {
        const simple = line.trim().match(/at (.+?):(\d+):\d+/);
        if (simple) {
          frames.push({
            fn: '<anonymous>',
            file: simple[1] ?? '',
            line: Number(simple[2] ?? 0),
          });
        }
      }
    }
    return frames;
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Type guards (avoids importing auth/validation at module level) ──

  private isAuthException(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === 'AuthenticationException' ||
        error.name === 'InvalidCredentialsException')
    );
  }

  private isAuthorizationException(error: unknown): boolean {
    return error instanceof Error && error.name === 'AuthorizationException';
  }

  private isResetTokenException(error: unknown): boolean {
    return error instanceof Error && error.name === 'InvalidResetTokenException';
  }

  private isValidationException(error: unknown): boolean {
    return error instanceof Error && error.name === 'ValidationException';
  }
}
