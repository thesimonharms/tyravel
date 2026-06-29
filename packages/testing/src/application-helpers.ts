import type { Application } from '@pondoknusa/core';
import {
  HttpKernel,
  setAuthApplication,
  setCacheApplication,
  setEventApplication,
  setGateApplication,
  setBroadcastApplication,
  setMailApplication,
  setNotificationApplication,
  setPasswordApplication,
  setQueueApplication,
  setRouteApplication,
  setViewApplication,
} from '@pondoknusa/core';

/**
 * Wire Pondoknusa facades to the application under test (call after boot).
 */
export function wireFacades(app: Application): void {
  setRouteApplication(app);
  setViewApplication(app);
  setQueueApplication(app);
  setEventApplication(app);
  setAuthApplication(app);
  setGateApplication(app);
  setPasswordApplication(app);
  setCacheApplication(app);
  setBroadcastApplication(app);
  setMailApplication(app);
  setNotificationApplication(app);
}

export function createHttpKernel(app: Application): HttpKernel {
  return new HttpKernel(app);
}