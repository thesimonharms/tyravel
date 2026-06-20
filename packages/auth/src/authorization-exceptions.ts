export class AuthorizationException extends Error {
  constructor(message = 'This action is unauthorized.') {
    super(message);
    this.name = 'AuthorizationException';
  }
}

export class InvalidResetTokenException extends Error {
  constructor(message = 'This password reset token is invalid.') {
    super(message);
    this.name = 'InvalidResetTokenException';
  }
}