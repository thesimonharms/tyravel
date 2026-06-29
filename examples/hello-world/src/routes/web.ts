import { Route, View } from '@pondoknusa/core';
import { coalesceHydrationManifest, Response } from '@pondoknusa/http';
import { UserController } from '../controllers/user-controller.js';

export function registerWebRoutes(): void {
  Route.get('/', async () => {
    const html = await View.render('welcome', {
      name: 'Pondoknusa',
      message: 'A TypeScript-native web framework with Laravel ergonomics.',
      tagline: 'Views, routes, models, and migrations — all in TypeScript.',
    });

    return Response.ssr(html, {
      hydrationManifest: coalesceHydrationManifest(View.getHydrationManifest()),
    });
  });

  Route.get('/stream', () =>
    View.streamSsr('streamed', {
      name: 'Pondoknusa',
    }),
  );

  Route.prefix('api')
    .middleware('json')
    .group(() => {
      Route.get('/users', [UserController, 'index']);
      Route.get('/users/:id', [UserController, 'show']).name('users.show');
    });
}