import { join } from 'node:path';
import { PgDatabaseServiceProvider } from '@tyravel/database-pg';
import {
  Application,
  AuthServiceProvider,
  CacheServiceProvider,
  ConfigRepository,
  ConfigServiceProvider,
  LogServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  HealthServiceProvider,
  HttpKernel,
  ScheduleServiceProvider,
  MailServiceProvider,
  NotificationServiceProvider,
  QueueServiceProvider,
  StorageServiceProvider,
  registerHttpMiddleware,
  setAuthApplication,
  setCacheApplication,
  setDbApplication,
  setEventApplication,
  setLogApplication,
  setGateApplication,
  setMailApplication,
  setNotificationApplication,
  setPasswordApplication,
  setQueueApplication,
  setRouteApplication,
  setStorageApplication,
  setViewApplication,
  ViewServiceProvider,
  serve,
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';

const appRoot = join(import.meta.dirname ?? import.meta.dir, '..');
const app = new Application(appRoot);
setRouteApplication(app);
setViewApplication(app);
setQueueApplication(app);
setEventApplication(app);
setCacheApplication(app);
setDbApplication(app);
setStorageApplication(app);
setLogApplication(app);
setMailApplication(app);
setNotificationApplication(app);
setAuthApplication(app);
setGateApplication(app);
setPasswordApplication(app);

app.register(ConfigServiceProvider);
app.register(PgDatabaseServiceProvider);
app.register(DatabaseServiceProvider);
app.register(CacheServiceProvider);
app.register(StorageServiceProvider);
app.register(LogServiceProvider);
app.register(MailServiceProvider);
app.register(NotificationServiceProvider);
app.register(QueueServiceProvider);
app.register(EventServiceProvider);
app.register(ScheduleServiceProvider);
app.register(HealthServiceProvider);
app.register(AuthServiceProvider);
app.register(ViewServiceProvider);
app.register(AppServiceProvider);

setRouteApplication(app);
setViewApplication(app);

await app.boot();

registerHttpMiddleware(app, app.make(ConfigRepository));

const { registerRoutes } = await import('./routes/index.js');
registerRoutes();

const kernel = new HttpKernel(app);
await serve(kernel);