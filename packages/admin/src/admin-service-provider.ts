import { isAbsolute, join } from 'node:path';
import type { AuthManager, Gate } from '@pondoknusa/auth';
import type { ConfigRepository } from '@pondoknusa/config';
import type { Constructor } from '@pondoknusa/container';
import type { DatabaseManager } from '@pondoknusa/database';
import type { Middleware } from '@pondoknusa/http';
import type { ViewEngine } from '@pondoknusa/views';
import { AdminAuditLogger } from './audit-log.js';
import { AdminRegistry } from './admin-registry.js';
import type { AdminDashboardDependencies } from './dashboard.js';
import type { StorageLike } from './file-upload.js';
import { createAdminMiddleware } from './middleware.js';
import { AdminController } from './resource-controller.js';
import type { AdminConfig } from './types.js';
import { ADMIN_VIEWS_PATH } from './views-path.js';

export interface AdminApplication {
  basePath: string;
  make<T>(key: string | Constructor<T>): T;
  instance(key: string | Constructor<unknown>, value: unknown): void;
  singleton(key: string | Constructor<unknown>, factory: () => unknown): void;
  middleware(name: string, middleware: Middleware): void;
}

interface HealthCheckerLike {
  run(): Promise<{
    status: 'ok' | 'fail';
    checks: Record<string, { ok: boolean; error?: string }>;
  }>;
}

interface FailedJobRepositoryLike {
  all(limit?: number): Promise<unknown[]>;
}

export class AdminServiceProvider {
  private audit?: AdminAuditLogger;

  constructor(private readonly app: AdminApplication) {}

  register(): void {
    const registry = new AdminRegistry();
    this.app.instance('admin.registry', registry);
    this.app.singleton(AdminRegistry, () => registry);

    this.audit = this.createAuditLogger();
    void this.audit.load();
    this.app.instance('admin.audit', this.audit);
    this.app.singleton(AdminAuditLogger, () => this.audit!);

    this.app.singleton(AdminController, () => this.createController());
  }

  boot(): void {
    const config = this.resolveConfig();
    const engine = this.app.make<ViewEngine>('view');
    engine.namespace('admin', ADMIN_VIEWS_PATH);

    const gate = this.app.make<Gate>('gate');
    const auth = this.app.make<AuthManager>('auth');
    this.app.middleware(
      'admin',
      createAdminMiddleware({
        gate,
        auth,
        ability: config.accessAbility,
        policyModel: config.accessPolicyModel,
      }),
    );
  }

  private createController(): AdminController {
    return new AdminController({
      registry: this.app.make(AdminRegistry),
      view: this.app.make<ViewEngine>('view'),
      gate: this.app.make<Gate>('gate'),
      auth: this.app.make<AuthManager>('auth'),
      config: this.resolveConfig(),
      dashboard: this.resolveDashboardDependencies(),
      storage: this.tryMake<StorageLike>('storage'),
      audit: this.audit,
    });
  }

  private createAuditLogger(): AdminAuditLogger {
    const config = this.resolveConfig();
    if (config.auditLog?.enabled === false) {
      return new AdminAuditLogger({ maxEntries: config.auditLog?.maxEntries ?? 500 });
    }

    const relative = config.auditLog?.persistPath ?? '.pondoknusa/admin-audit.json';
    const persistPath = isAbsolute(relative)
      ? relative
      : join(this.app.basePath, relative);

    return new AdminAuditLogger({
      maxEntries: config.auditLog?.maxEntries ?? 500,
      persistPath,
    });
  }

  private resolveDashboardDependencies(): AdminDashboardDependencies {
    const deps: AdminDashboardDependencies = {};

    const health = this.tryMake<HealthCheckerLike>('health');
    if (health) {
      deps.runHealth = () => health.run();
    }

    const failedJobs = this.tryMake<FailedJobRepositoryLike>('queue.failed');
    if (failedJobs) {
      deps.countFailedJobs = async () => {
        const jobs = await failedJobs.all(500);
        return jobs.length;
      };
    }

    const database = this.tryMake<DatabaseManager>('db');
    if (database) {
      deps.countQueueDepth = async () => {
        try {
          const connection = database.connection();
          const result = await connection.query('SELECT COUNT(*) AS total FROM jobs');
          const total = result.rows[0]?.total;
          return Number(total ?? 0);
        } catch {
          return 0;
        }
      };
    }

    return deps;
  }

  private resolveConfig(): AdminConfig {
    try {
      const config = this.app.make<ConfigRepository>('config');
      return config.get<AdminConfig>('admin') ?? {};
    } catch {
      return {};
    }
  }

  private tryMake<T>(token: string | Constructor<T>): T | undefined {
    try {
      return this.app.make<T>(token);
    } catch {
      return undefined;
    }
  }
}