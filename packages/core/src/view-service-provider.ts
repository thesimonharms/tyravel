import { randomBytes } from 'node:crypto';
import { ConfigRepository } from '@tyravel/config';
import type { AuthManager, Gate } from '@tyravel/auth';
import type { TyravelRequest } from '@tyravel/http';
import {
  ViewEngine,
  ViewErrorBag,
  type ValidationErrors,
  type ViewConfig,
} from '@tyravel/views';
import { ServiceProvider } from './service-provider.js';
import { setViewApplication, setViewRequest } from './view.js';

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  path: 'resources/views',
  extension: '.tyr',
  env: process.env.NODE_ENV ?? 'production',
};

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
  override register() {
    const config = this.app.make<ConfigRepository>('config');
    const viewConfig = config.get<ViewConfig>('views') ?? DEFAULT_VIEW_CONFIG;
    const engine = new ViewEngine(this.app.basePath, viewConfig);

    this.app.instance('view', engine);
    this.app.singleton(ViewEngine, () => engine);
  }

  override boot() {
    setViewApplication(this.app);

    const engine = this.app.make<ViewEngine>('view');
    const config = this.app.make<ConfigRepository>('config');

    const environment = String(
      viewConfig.env ?? config.get('app.env', process.env.NODE_ENV ?? 'production'),
    );
    engine.setEnvironment(environment);

    if (viewConfig.locale) {
      engine.setLocale(viewConfig.locale);
    }

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
        __: (key, replacements = {}) =>
          engine.translate(
            String(key),
            replacements as Record<string, string | number>,
          ),
      });
      engine.setForm({
        csrfToken: () => ensureCsrfToken(request),
        errors: () => readValidationErrors(request),
      });
    };

    applyBindings();

    this.app.use(async (request, next) => {
      setViewRequest(request);
      applyBindings(request);

      try {
        return await next();
      } finally {
        setViewRequest(undefined);
        applyBindings();
      }
    });

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
  }
}