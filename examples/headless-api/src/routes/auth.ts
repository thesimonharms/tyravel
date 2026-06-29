import { Route } from '@pondoknusa/core';
import { AuthController } from '../controllers/AuthController.js';

Route.prefix('api/v1').middleware('throttle:api').group((routes) => {
  routes.middleware('guest').post('/login', [AuthController, 'login']);
  routes.middleware('guest').post('/forgot-password', [AuthController, 'forgotPassword']);
  routes.middleware('guest').post('/reset-password', [AuthController, 'resetPassword']);
  routes.middleware('auth:api').get('/me', [AuthController, 'me']);
  routes.middleware('auth:api').post('/logout', [AuthController, 'logout']);
  routes.middleware('auth:api').post('/tokens', [AuthController, 'createToken']);
  routes.middleware('auth:api').delete('/tokens/:id', [AuthController, 'revokeToken']);
  routes.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
  routes.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
});