import { join } from 'node:path';
import { buildConfigCacheManifest, loadConfig } from '@tyravel/config';
import {
  Application,
  ConfigServiceProvider,
  setRouteApplication,
  ServiceProvider,
} from '@tyravel/core';
import { Command } from '../command.js';
import { runDoctorChecks } from '../doctor-checks.js';
import { isHeadlessProject } from '../headless-project.js';
import { requireProjectRoot } from '../project.js';
import { importAppServiceProvider, importProjectRoutes } from '../project-bootstrap.js';
import { bootViewApplication, enableCompiledCache } from '../view-bootstrap.js';

export class DeployCheckCommand extends Command {
  override readonly name = 'deploy:check';
  override readonly description = 'Run pre-deploy checks (doctor, routes, views)';
  override readonly usage = 'tyravel deploy:check';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();
    const checks = await runDoctorChecks(root);

    console.log('Tyravel deploy:check');
    console.log('');

    let failed = 0;
    for (const check of checks) {
      const icon = check.ok ? '✓' : '✗';
      console.log(`${icon} ${check.name}: ${check.message}`);
      if (!check.ok) {
        failed += 1;
      }
    }

    const routeCheck = await validateRouteManifest(root);
    const routeIcon = routeCheck.ok ? '✓' : '✗';
    console.log(`${routeIcon} routes: ${routeCheck.message}`);
    if (!routeCheck.ok) {
      failed += 1;
    }

    const configCheck = await validateConfigManifest(root);
    const configIcon = configCheck.ok ? '✓' : '✗';
    console.log(`${configIcon} config: ${configCheck.message}`);
    if (!configCheck.ok) {
      failed += 1;
    }

    const headless = await isHeadlessProject(root);
    const viewCheck = headless
      ? { ok: true, message: 'Headless mode — view compilation skipped' }
      : await validateViewCompilation(root);
    const viewIcon = viewCheck.ok ? '✓' : '✗';
    console.log(`${viewIcon} views: ${viewCheck.message}`);
    if (!viewCheck.ok) {
      failed += 1;
    }

    console.log('');
    if (failed > 0) {
      console.log(`${failed} check(s) failed.`);
      return 1;
    }

    console.log('All deploy checks passed.');
    return 0;
  }
}

async function validateRouteManifest(root: string): Promise<{ ok: boolean; message: string }> {
  try {
    await loadConfig(root);

    const app = new Application(root);
    setRouteApplication(app);
    app.register(ConfigServiceProvider);

    const providerModule = await importAppServiceProvider(root);
    if (providerModule?.AppServiceProvider) {
      const Provider = providerModule.AppServiceProvider as new (
        application: Application,
      ) => ServiceProvider;
      app.register(Provider);
    }

    await app.boot();

    const routesModule = await importProjectRoutes(root);
    routesModule?.registerRoutes?.();

    const manifest = app.router().warmRouteCache().exportRouteCache();
    if (manifest.routes.length === 0) {
      return { ok: false, message: 'No routes registered — check src/routes/' };
    }

    return {
      ok: true,
      message: `${manifest.routes.length} route(s) compile for route:cache`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateConfigManifest(root: string): Promise<{ ok: boolean; message: string }> {
  try {
    await loadConfig(root);
    const manifest = await buildConfigCacheManifest(root);
    return {
      ok: true,
      message: `${Object.keys(manifest.config).length} config file(s) compile for config:cache`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function validateViewCompilation(root: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { engine, viewConfig } = await bootViewApplication(root);
    const targetDir = join(root, viewConfig.compiledPath ?? 'storage/framework/views');
    enableCompiledCache(engine, root, viewConfig);

    const count = await engine.warmCompiledCache();
    if (count === 0) {
      return { ok: true, message: 'No views to compile (OK for API-only apps)' };
    }

    return {
      ok: true,
      message: `${count} view(s) compile to ${targetDir}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}