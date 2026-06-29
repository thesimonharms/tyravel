import type { Notification } from '@pondoknusa/notifications';
import { notify as sendNotification } from '@pondoknusa/notifications';
import type { Notifiable } from '@pondoknusa/notifications';
import type { Application } from './application.js';

let notificationApplication: Application | undefined;

export function setNotificationApplication(app: Application): void {
  notificationApplication = app;
}

function resolveManager() {
  if (!notificationApplication) {
    throw new Error('Notifications facade is not ready. Boot the application first.');
  }
  return notificationApplication.make<import('@pondoknusa/notifications').NotificationManager>('notifications');
}

export interface NotificationsFacade {
  send(notifiable: Notifiable, notification: Notification): Promise<void>;
  sendNow(notifiable: Notifiable, notification: Notification): Promise<void>;
}

export const Notifications: NotificationsFacade = {
  send: (notifiable, notification) => sendNotification(notifiable, notification),
  sendNow: (notifiable, notification) => resolveManager().sendNow(notifiable, notification),
};