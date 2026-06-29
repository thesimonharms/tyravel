import { join } from 'node:path';
import {
  Application,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  HttpKernel,
  QueueServiceProvider,
  registerHttpMiddleware,
  setDbApplication,
  setQueueApplication,
  setRouteApplication,
  serve,
} from '@pondoknusa/core';
import { ConfigRepository } from '@pondoknusa/config';
import { registerEmbedModel, registerLocalVectorSearchDriver, setEmbedChunksHandler } from '@pondoknusa/vector';
import { AppServiceProvider } from './providers/app-service-provider.js';
import { Document } from './models/document.js';
import { embed } from './embed.js';

const appRoot = join(import.meta.dirname ?? import.meta.dir, '..');
const app = new Application(appRoot);
setRouteApplication(app);
setDbApplication(app);
setQueueApplication(app);

registerLocalVectorSearchDriver('sqlite');
registerEmbedModel('Document', Document);
setEmbedChunksHandler(embed);

app.register(ConfigServiceProvider);
app.register(DatabaseServiceProvider);
app.register(QueueServiceProvider);
app.register(AppServiceProvider);

await app.boot();

registerHttpMiddleware(app, app.make(ConfigRepository));

const { registerRoutes } = await import('./routes/index.js');
registerRoutes();

const kernel = new HttpKernel(app);
await serve(kernel);