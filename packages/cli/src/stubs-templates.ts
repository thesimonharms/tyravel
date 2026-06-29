import type { NewProjectOptions } from './new-project-options.js';

export type ProjectTemplate = 'default' | 'api' | 'ssr' | 'saas' | 'headless';

export function parseProjectTemplate(value: string | undefined): ProjectTemplate {
  if (!value || value === 'default') {
    return 'default';
  }
  if (value === 'api' || value === 'ssr' || value === 'saas' || value === 'headless') {
    return value;
  }
  throw new Error(`Unsupported template "${value}". Use default, api, ssr, saas, or headless.`);
}

export function applyTemplateDefaults(
  template: ProjectTemplate,
  options: NewProjectOptions,
): NewProjectOptions {
  if (template === 'api') {
    return { ...options, auth: false };
  }

  if (template === 'saas') {
    return { ...options, auth: true, redis: options.redis || false };
  }

  if (template === 'headless') {
    return { ...options, headless: true, ai: false, auth: options.auth };
  }

  return options;
}

export function webRoutesForTemplate(template: ProjectTemplate): string {
  if (template === 'api') {
    return `import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.prefix('api').group((routes) => {
  routes.get('/health', () => Response.json({ ok: true }));
  routes.get('/posts', () => Response.json({ data: [] }));
  routes.post('/posts', () => Response.json({ data: { id: 1 } }, { status: 201 }));
});
`;
  }

  if (template === 'ssr') {
    return `import { Route, View } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.get('/', async () =>
  Response.html(await View.render('welcome', { title: 'Welcome to Pondoknusa' })),
);
`;
  }

  if (template === 'saas') {
    return `import { Route, View } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.get('/', async () =>
  Response.html(await View.render('welcome', {
    title: 'SaaS starter',
    subtitle: 'Run pondoknusa auth:install to scaffold login and OAuth routes.',
  })),
);

Route.get('/dashboard', () => Response.json({ message: 'Protected area — add auth middleware here.' }));
`;
  }

  return `import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.get('/', (request) =>
  Response.json({
    message: 'Welcome to Pondoknusa',
    path: request.path,
  }),
);
`;
}