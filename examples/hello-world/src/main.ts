import { join } from 'node:path';
import {
  Application,
  AuthServiceProvider,
  CacheServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  HttpKernel,
  MailServiceProvider,
  NotificationServiceProvider,
  QueueServiceProvider,
  setAuthApplication,
  setCacheApplication,
  setEventApplication,
  setGateApplication,
  setMailApplication,
  setNotificationApplication,
  setPasswordApplication,
  setQueueApplication,
  setRouteApplication,
  setViewApplication,
  ViewServiceProvider,
  serve,
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';

const app = new Application(join(import.meta.dir, '..'));
setRouteApplication(app);
setViewApplication(app);
setQueueApplication(app);
setEventApplication(app);
setCacheApplication(app);
setMailApplication(app);
setNotificationApplication(app);
setAuthApplication(app);
setGateApplication(app);
setPasswordApplication(app);

app.register(ConfigServiceProvider);
app.register(DatabaseServiceProvider);
app.register(CacheServiceProvider);
app.register(MailServiceProvider);
app.register(NotificationServiceProvider);
app.register(QueueServiceProvider);
app.register(EventServiceProvider);
app.register(AuthServiceProvider);
app.register(ViewServiceProvider);
app.register(AppServiceProvider);

setRouteApplication(app);
setViewApplication(app);

await app.boot();

const { registerRoutes } = await import('./routes/index.js');
registerRoutes();

const kernel = new HttpKernel(app);
await serve(kernel);