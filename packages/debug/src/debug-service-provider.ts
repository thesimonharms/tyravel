import { isAbsolute, join } from 'node:path';
import type { ConfigRepository } from '@pondoknusa/config';
import type { Constructor } from '@pondoknusa/container';
import type { LogManager } from '@pondoknusa/log';
import type { Groupable, Middleware } from '@pondoknusa/http';
import { setQueueWorkerProcessHook } from '@pondoknusa/queue';
import { extractDebugRequestId } from './correlation.js';
import { DebugCorrelationStore } from './correlation-store.js';
import { registerDebugRoutes } from './register-routes.js';
import { createDebugMiddleware } from './middleware.js';
import { DebugStore } from './store.js';
import {
  instrumentBroadcaster,
  instrumentCacheStore,
  instrumentDispatcher,
  instrumentEventDispatcher,
  instrumentMailer,
  instrumentNotificationManager,
  type BroadcasterLike,
  type CacheStoreLike,
  type DispatcherLike,
  type EventDispatcherLike,
  type MailLike,
  type NotificationManagerLike,
} from './instrumentation.js';
import type { DebugConfig } from './types.js';

export interface DebugApplication {
  basePath: string;
  make<T>(key: string | Constructor<T>): T;
  instance(key: string | Constructor<unknown>, value: unknown): void;
  middleware(name: string, middleware: Middleware): void;
  use(...middleware: Array<Middleware | string>): void;
  router?(): Groupable;
}

export class DebugServiceProvider {
  private store?: DebugStore;
  private correlationStore?: DebugCorrelationStore;

  constructor(private readonly app: DebugApplication) {}

  async register(): Promise<void> {
    const config = this.resolveConfig();
    const persistPath = this.resolvePersistPath(config);
    const store = new DebugStore(config.maxEntries ?? 50, config.persist ? persistPath : undefined);
    await store.load();

    const correlationsPath = this.resolveCorrelationsPath(config);
    const correlationStore = new DebugCorrelationStore(
      config.maxEntries ?? 50,
      config.persist ? correlationsPath : undefined,
    );
    await correlationStore.load();

    this.store = store;
    this.correlationStore = correlationStore;
    this.app.instance('debug.store', store);
    this.app.instance(DebugStore, store);
    this.app.instance('debug.correlations', correlationStore);
    this.app.instance(DebugCorrelationStore, correlationStore);
  }

  boot(): void {
    const config = this.resolveConfig();
    const debugEnabled = this.isEnabled(config);
    const otelEnabled = config.otel?.enabled === true && Boolean(config.otel.endpoint);
    if ((!debugEnabled && !otelEnabled) || !this.store) {
      return;
    }

    this.instrumentServices();
    this.registerQueueWorkerHook();

    const log = this.tryMake<LogManager>('log');
    const middleware = createDebugMiddleware({
      enabled: true,
      config: {
        ...config,
        injectBar: debugEnabled ? config.injectBar : false,
        persist: debugEnabled ? config.persist : false,
      },
      store: this.store,
      log,
      recordEntries: debugEnabled,
    });

    this.app.middleware('debug', middleware);
    this.app.use('debug');

    const router = this.app.router?.();
    if (router) {
      registerDebugRoutes(router, this.store, {
        path: config.path,
        correlationStore: this.correlationStore,
      });
    }
  }

  getStore(): DebugStore | undefined {
    return this.store;
  }

  private isEnabled(config: DebugConfig): boolean {
    if (config.enabled === false) {
      return false;
    }

    try {
      const appConfig = this.app.make<ConfigRepository>('config').get<{ debug?: boolean }>('app');
      return appConfig.debug === true;
    } catch {
      return process.env.APP_DEBUG === 'true';
    }
  }

  private resolveConfig(): DebugConfig {
    try {
      return this.app.make<ConfigRepository>('config').get<DebugConfig>('debug') ?? {};
    } catch {
      return {};
    }
  }

  private resolvePersistPath(config: DebugConfig): string {
    const relative = config.persistPath ?? '.pondoknusa/debug-entries.json';
    return isAbsolute(relative) ? relative : join(this.app.basePath, relative);
  }

  private resolveCorrelationsPath(config: DebugConfig): string {
    const relative = config.correlationsPath ?? '.pondoknusa/debug-correlations.json';
    return isAbsolute(relative) ? relative : join(this.app.basePath, relative);
  }

  private instrumentServices(): void {
    this.instrumentCache();
    this.instrumentQueue();
    this.instrumentEvents();
    this.instrumentMail();
    this.instrumentNotifications();
    this.instrumentBroadcasting();
  }

  private registerQueueWorkerHook(): void {
    if (!this.correlationStore) {
      return;
    }

    const store = this.correlationStore;
    setQueueWorkerProcessHook(async ({ payload, queue, durationMs, error }) => {
      const parentRequestId = extractDebugRequestId(payload.data);
      if (!parentRequestId) {
        return;
      }

      store.record({
        parentRequestId,
        job: payload.displayName ?? payload.job,
        queue,
        status: error ? 'failed' : 'completed',
        durationMs,
      });
    });
  }

  private instrumentCache(): void {
    const cache = this.tryMake<CacheStoreLike>('cache');
    if (!cache) {
      return;
    }
    this.app.instance('cache', instrumentCacheStore(cache));
  }

  private instrumentQueue(): void {
    const dispatcher = this.tryMake<DispatcherLike>('queue.dispatcher');
    if (!dispatcher) {
      return;
    }
    this.app.instance('queue.dispatcher', instrumentDispatcher(dispatcher));
  }

  private instrumentEvents(): void {
    const events = this.tryMake<EventDispatcherLike>('events');
    if (!events) {
      return;
    }
    this.app.instance('events', instrumentEventDispatcher(events));
  }

  private instrumentMail(): void {
    const mail = this.tryMake<{ mailer(name?: string): MailLike }>('mail');
    if (!mail) {
      return;
    }

    const originalMailer = mail.mailer.bind(mail);
    mail.mailer = (name?: string) => instrumentMailer(originalMailer(name));
  }

  private instrumentNotifications(): void {
    const notifications = this.tryMake<NotificationManagerLike>('notifications');
    if (!notifications) {
      return;
    }
    this.app.instance('notifications', instrumentNotificationManager(notifications));
  }

  private instrumentBroadcasting(): void {
    const broadcast = this.tryMake<{ connection(name?: string): BroadcasterLike }>('broadcasting');
    if (!broadcast) {
      return;
    }

    const original = broadcast.connection.bind(broadcast);
    broadcast.connection = (name?: string) => instrumentBroadcaster(original(name));
  }

  private tryMake<T>(token: string | Constructor<T>): T | undefined {
    try {
      return this.app.make<T>(token);
    } catch {
      return undefined;
    }
  }
}