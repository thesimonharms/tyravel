import { Route } from '@tyravel/core';
import { AuthController } from '../controllers/auth-controller.js';

export function registerAuthRoutes(): void {
  Route.middleware('guest').post('/register', [AuthController, 'register']);
  Route.middleware('guest').post('/login', [AuthController, 'login']);
  Route.middleware('auth').post('/logout', [AuthController, 'logout']);
  Route.middleware('auth').get('/me', [AuthController, 'me']);
  Route.middleware('guest').post('/forgot-password', [AuthController, 'forgotPassword']);
  Route.middleware('guest').post('/reset-password', [AuthController, 'resetPassword']);
  Route.middleware('auth').post('/tokens', [AuthController, 'createToken']);
  Route.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
  Route.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
}