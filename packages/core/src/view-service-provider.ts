import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { resolveEchoClientConfig, type BroadcastingConfig } from '@tyravel/broadcasting';
import { ConfigRepository } from '@tyravel/config';
import type { AuthManager, Gate } from '@tyravel/auth';
import type { TyravelRequest } from '@tyravel/http';
import { withMiddlewareMeta } from '@tyravel/http';
import {
  createViewWatcher,
  DEFAULT_VIEW_CONFIG,
  ViewEngine,
  ViewErrorBag,
  type ValidationErrors,
  type ViewConfig,
} from '@tyravel/views';
import { ServiceProvider } from './service-provider.js';
import { setViewApplication, setViewRequest } from './view.js';

function joinAssetUrl(base: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return normalized;
  }
  return `${base.replace(/\/$/, '')}${normalized}`;
}

function readOldInput(
  request: TyravelRequest | undefined,
  key: string,
  defaultValue?: unknown,
): unknown {
  const flash = request?.session?.get<Record<string, unknown>>('_old_input');
  if (!flash) {
    return defaultValue;
  }
  return flash[key] ?? defaultValue;
}

function ensureCsrfToken(request: TyravelRequest | undefined): string {
  const session = request?.session;
  if (!session) {
    return '';
  }

  let token = session.get<string>('_csrf_token');
  if (!token) {
    token = randomBytes(32).toString('base64url');
    session.put('_csrf_token', token);
  }
  return token;
}

function readValidationErrors(request: TyravelRequest | undefined): ViewErrorBag {
  const errors = request?.session?.get<ValidationErrors>('_errors') ?? {};
  return new ViewErrorBag(errors);
}

export class ViewServiceProvider extends ServiceProvider {
  override async register() {
    const config = this.app.make<ConfigRepository>('config');
    const viewConfig = config.get<ViewConfig>('views') ?? DEFAULT_VIEW_CONFIG;
    const engine = new ViewEngine(this.app.basePath, viewConfig);

    this.app.instance('view', engine);
    this.app.singleton(ViewEngine, () => engine);
  }

  override async boot() {
    setViewApplication(this.app);

    const engine = this.app.make<ViewEngine>('view');
    const config = this.app.make<ConfigRepository>('config');
    const viewConfig = config.get<ViewConfig>('views') ?? DEFAULT_VIEW_CONFIG;

    const environment = String(
      viewConfig.env ?? config.get('app.env', process.env.NODE_ENV ?? 'production'),
    );
    engine.setEnvironment(environment);

    if (viewConfig.locale) {
      engine.setLocale(viewConfig.locale);
    }

    engine.setInjector((binding) => this.app.make(binding));

    const broadcasting = config.get<BroadcastingConfig>('broadcasting', {
      default: 'null',
      connections: { null: { driver: 'null' } },
    });
    const appUrl = String(config.get('app.url', 'http://127.0.0.1:3000') ?? 'http://127.0.0.1:3000');
    engine.setEchoClientConfig(resolveEchoClientConfig(broadcasting, appUrl));

    const applyBindings = (request?: TyravelRequest) => {
      engine.setBindings({
        route: (name, params = {}) => {
          const normalized = Object.fromEntries(
            Object.entries(params).map(([key, value]) => [key, String(value)]),
          );
          return this.app.router().url(name, normalized);
        },
        asset: (path) =>
          joinAssetUrl(String(config.get('app.asset_url', '') ?? ''), path),
        config: (key, defaultValue) => config.get(key, defaultValue),
        old: (key, defaultValue) => readOldInput(request, key, defaultValue),
        __: (key: string, replacements: Record<string, string | number> = {}) =>
          engine.translate(String(key), replacements),
        csrf_token: () => ensureCsrfToken(request),
      });
      engine.setForm({
        csrfToken: () => ensureCsrfToken(request),
        errors: () => readValidationErrors(request),
      });
    };

    applyBindings();

    this.app.use(
      withMiddlewareMeta(async (request, next) => {
        setViewRequest(request);
        applyBindings(request);

        try {
          return await next();
        } finally {
          setViewRequest(undefined);
          applyBindings();
        }
      }, { tag: 'view' }),
    );

    try {
      const auth = this.app.make<AuthManager>('auth');
      const gate = this.app.make<Gate>('gate');
      engine.setAuth({
        check: () => auth.check(),
        user: () => auth.user(),
        can: (ability, model) => gate.allows(auth.user(), ability, model),
      });
    } catch {
      // Auth provider not registered — auth directives render as guest/no-op.
    }

    if (viewConfig.preloadCompiled && viewConfig.compiled) {
      const cachePath = join(
        this.app.basePath,
        viewConfig.compiledPath ?? 'storage/framework/views',
      );
      engine.setCompiledCachePath(cachePath);
      await engine.preloadCompiledCache();
    }

    this.startViewWatcherIfRequested(engine, viewConfig, environment);
  }

  private startViewWatcherIfRequested(
    engine: ViewEngine,
    viewConfig: ViewConfig,
    environment: string,
  ): void {
    if (process.env.TYRAVEL_VIEW_WATCH !== '1' || environment === 'production') {
      return;
    }

    const cachePath = join(
      this.app.basePath,
      viewConfig.compiledPath ?? 'storage/framework/views',
    );
    engine.setCompiledCachePath(cachePath);

    const watcher = createViewWatcher(engine, {
      onRecompiled: (viewName) => {
        console.log(`[views] Recompiled ${viewName}`);
      },
      onError: (error) => {
        console.error(`[views] ${error.message}`);
      },
    });

    const closeWatcher = (): void => {
      watcher.close();
    };

    process.once('SIGINT', closeWatcher);
    process.once('SIGTERM', closeWatcher);
  }
}