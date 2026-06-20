import { describe, expect, it } from 'vitest';
import { Application } from './application.js';
import { ConfigRepository } from '@tyravel/config';
import { ExceptionHandler } from './exception-handler.js';
import {
  HttpException,
  MethodNotAllowedException,
  RouteNotFoundException,
} from '@tyravel/http';
import { ValidationException } from '@tyravel/validation';

function makeApp(debug: boolean): Application {
  const app = new Application();
  app.instance('config', new ConfigRepository({ app: { debug } }));
  return app;
}

function jsonRequest(): Request {
  return new Request('https://example.com/test', {
    headers: { accept: 'application/json' },
  });
}

function htmlRequest(): Request {
  return new Request('https://example.com/test', {
    headers: { accept: 'text/html' },
  });
}

describe('ExceptionHandler', () => {
  describe('status code mapping', () => {
    it('maps RouteNotFoundException to 404', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new RouteNotFoundException('GET', '/missing'),
        jsonRequest(),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain('Route not found');
      expect(body.status).toBe(404);
    });

    it('maps MethodNotAllowedException to 405 with Allow header', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new MethodNotAllowedException('POST', '/users', ['GET']),
        jsonRequest(),
      );
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('GET');
    });

    it('maps HttpException to its status code', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new HttpException('Teapot', 418),
        jsonRequest(),
      );
      expect(res.status).toBe(418);
      const body = await res.json();
      expect(body.message).toBe('Teapot');
    });

    it('maps ValidationException to 422 with errors', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new ValidationException({ email: ['Invalid email'] }),
        jsonRequest(),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.errors).toEqual({ email: ['Invalid email'] });
    });

    it('maps unknown errors to 500', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new Error('Something went wrong'),
        jsonRequest(),
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Server Error');
    });
  });

  describe('debug mode', () => {
    it('includes exception details in JSON when debug is true', async () => {
      const handler = new ExceptionHandler(makeApp(true));
      const res = await handler.render(
        new Error('Database exploded'),
        jsonRequest(),
      );
      const body = await res.json();
      expect(body.message).toBe('Database exploded');
      expect(body.exception).toBe('Error');
      expect(body.trace).toBeDefined();
      expect(Array.isArray(body.trace)).toBe(true);
    });

    it('hides exception details when debug is false', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new Error('Database exploded'),
        jsonRequest(),
      );
      const body = await res.json();
      expect(body.message).toBe('Server Error');
      expect(body.exception).toBeUndefined();
      expect(body.trace).toBeUndefined();
    });
  });

  describe('response format negotiation', () => {
    it('returns JSON for API requests', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new HttpException('Not found', 404),
        jsonRequest(),
      );
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = await res.json();
      expect(body.message).toBe('Not found');
      expect(body.status).toBe(404);
    });

    it('returns HTML for web requests', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new HttpException('Not found', 404),
        htmlRequest(),
      );
      expect(res.headers.get('content-type')).toContain('text/html');
      const body = await res.text();
      expect(body).toContain('404');
      expect(body).toContain('<!DOCTYPE html>');
    });

    it('includes stack trace in HTML debug page', async () => {
      const handler = new ExceptionHandler(makeApp(true));
      const error = new Error('boom');
      const res = await handler.render(error, htmlRequest());
      const body = await res.text();
      expect(body).toContain('Stack Trace');
      expect(body).toContain('Error');
      expect(body).toContain('exception-handler');
    });

    it('renders a clean production page without trace', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const res = await handler.render(
        new Error('secret'),
        htmlRequest(),
      );
      const body = await res.text();
      expect(body).not.toContain('Stack Trace');
      expect(body).not.toContain('secret');
    });
  });

  describe('auth exceptions (name-based detection)', () => {
    it('maps AuthenticationException to 401', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const error = new Error('Unauthenticated.');
      error.name = 'AuthenticationException';
      const res = await handler.render(error, jsonRequest());
      expect(res.status).toBe(401);
    });

    it('maps AuthorizationException to 403', async () => {
      const handler = new ExceptionHandler(makeApp(false));
      const error = new Error('Unauthorized.');
      error.name = 'AuthorizationException';
      const res = await handler.render(error, jsonRequest());
      expect(res.status).toBe(403);
    });
  });
});
