import type { LogContext, LogRepository } from '@pondoknusa/log';
import type { Application } from './application.js';

let logApplication: Application | undefined;

export function setLogApplication(app: Application): void {
  logApplication = app;
}

function resolveLog(): LogRepository {
  if (!logApplication) {
    throw new Error('Log facade is not ready. Boot the application first.');
  }
  return logApplication.make<LogRepository>('log');
}

export interface LogFacade {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export const Log: LogFacade = {
  debug: (message, context) => resolveLog().debug(message, context),
  info: (message, context) => resolveLog().info(message, context),
  warn: (message, context) => resolveLog().warn(message, context),
  error: (message, context) => resolveLog().error(message, context),
};