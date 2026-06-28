import {
  Application,
  AuthServiceProvider,
  CacheServiceProvider,
  ConfigRepository,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  HttpKernel,
  LogServiceProvider,
  MailServiceProvider,
  NotificationServiceProvider,
  QueueServiceProvider,
  StorageServiceProvider,
  prepareHttpServer,
  setAuthApplication,
  setCacheApplication,
  setEventApplication,
  setGateApplication,
  setLogApplication,
  setMailApplication,
  setNotificationApplication,
  setPasswordApplication,
  setQueueApplication,
  setRouteApplication,
  setStorageApplication,
  serve,
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/api.js';
import './routes/auth.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setQueueApplication(app);
setEventApplication(app);
setCacheApplication(app);
setStorageApplication(app);
setLogApplication(app);
setMailApplication(app);
setNotificationApplication(app);
setAuthApplication(app);
setGateApplication(app);
setPasswordApplication(app);

app.register(ConfigServiceProvider);
app.register(DatabaseServiceProvider);
app.register(CacheServiceProvider);
app.register(StorageServiceProvider);
app.register(LogServiceProvider);
app.register(MailServiceProvider);
app.register(NotificationServiceProvider);
app.register(QueueServiceProvider);
app.register(EventServiceProvider);
app.register(AuthServiceProvider);
app.register(AppServiceProvider);

await app.boot();

await prepareHttpServer(app, app.make(ConfigRepository));

const kernel = new HttpKernel(app);
await serve(kernel);