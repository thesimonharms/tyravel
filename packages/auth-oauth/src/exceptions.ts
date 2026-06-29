import { HttpException } from '@pondoknusa/http';

export class OAuthServerException extends HttpException {
  readonly error: string;

  constructor(error: string, message: string, status = 400) {
    super(message, status);
    this.name = 'OAuthServerException';
    this.error = error;
  }
}

export function invalidRequest(message: string): OAuthServerException {
  return new OAuthServerException('invalid_request', message, 400);
}

export function invalidClient(message = 'Client authentication failed.'): OAuthServerException {
  return new OAuthServerException('invalid_client', message, 401);
}

export function invalidGrant(message: string): OAuthServerException {
  return new OAuthServerException('invalid_grant', message, 400);
}

export function unsupportedGrant(message: string): OAuthServerException {
  return new OAuthServerException('unsupported_grant_type', message, 400);
}

export function unauthorizedClient(message: string): OAuthServerException {
  return new OAuthServerException('unauthorized_client', message, 400);
}