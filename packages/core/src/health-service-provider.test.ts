import { describe, expect, it } from 'vitest';
import { ConfigRepository } from '@tyravel/config';
import { Application, HealthServiceProvider, setRouteApplication } from './index.js';

describe('HealthServiceProvider', () => {
  it('registers liveness and readiness routes', async () => {
    const app = new Application('/tmp');
    setRouteApplication(app);

    app.instance('config', new ConfigRepository({
      health: {
        enabled: true,
        path: '/health',
        livenessPath: '/health/live',
        readinessPath: '/health/ready',
        checks: { database: false, redis: false },
      },
    }));

    const provider = new HealthServiceProvider(app);
    await provider.register();
    await provider.boot();

    const paths = app.router().listRoutes().map((route) => route.uri);
    expect(paths).toContain('/health/live');
    expect(paths).toContain('/health/ready');
    expect(paths).toContain('/health');
  });
});