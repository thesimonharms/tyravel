import { ConfigRepository } from '@tyravel/config';
import type { AuthManager, Gate } from '@tyravel/auth';
import type { TyravelRequest } from '@tyravel/http';
import { ViewEngine, type ViewConfig } from '@tyravel/views';
import { ServiceProvider } from './service-provider.js';
import { setViewApplication, setViewRequest } from './view.js';

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  path: 'resources/views',
  extension: '.tyr',
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