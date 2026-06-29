import { Route } from '@pondoknusa/core';
import { AuthController } from '../controllers/auth-controller.js';

export function registerAuthRoutes(): void {
  Route.middleware(['csrf', 'guest']).post('/register', [AuthController, 'register']);
  Route.middleware(['csrf', 'guest']).post('/login', [AuthController, 'login']);
  Route.middleware(['csrf', 'auth']).post('/logout', [AuthController, 'logout']);
  Route.middleware('auth').get('/me', [AuthController, 'me']);
  Route.middleware(['csrf', 'guest']).post('/forgot-password', [AuthController, 'forgotPassword']);
  Route.middleware(['csrf', 'guest']).post('/reset-password', [AuthController, 'resetPassword']);
  Route.middleware(['csrf', 'auth']).post('/tokens', [AuthController, 'createToken']);
  Route.middleware(['csrf', 'auth']).delete('/tokens/:id', [AuthController, 'revokeToken']);
  Route.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
  Route.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
}