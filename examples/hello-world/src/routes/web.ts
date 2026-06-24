import { Route, View } from '@tyravel/core';
import { Response } from '@tyravel/http';
import { UserController } from '../controllers/user-controller.js';

export function registerWebRoutes(): void {
  Route.get('/', async () => {
    const html = await View.render('welcome', {
      name: 'Tyravel',
      message: 'A TypeScript-native web framework with Laravel ergonomics.',
      tagline: 'Views, routes, models, and migrations — all in TypeScript.',
    });

    return Response.ssr(html, {
      hydrationManifest: View.getHydrationManifest(),
    });
  });

  Route.get('/stream', () =>
    View.streamSsr('streamed', {
      name: 'Tyravel',
    }),
  );

  Route.prefix('api')
    .middleware('json')
    .group(() => {
      Route.get('/users', [UserController, 'index']);
      Route.get('/users/:id', [UserController, 'show']).name('users.show');
    });
}