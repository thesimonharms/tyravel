import type { Groupable, RouteHandler } from '@pondoknusa/http';

export interface RegisterAdminRoutesOptions {
  prefix?: string;
  middleware?: string[];
}

type AdminControllerConstructor = new (...args: never[]) => object;

function controllerAction(
  controller: AdminControllerConstructor,
  method: string,
): RouteHandler {
  return [controller, method] as unknown as RouteHandler;
}

export function registerAdminRoutes(
  routes: Groupable,
  controller: AdminControllerConstructor,
  options: RegisterAdminRoutesOptions = {},
): void {
  const prefix = options.prefix ?? '/admin';
  const middleware = options.middleware ?? ['admin'];

  routes.prefix(prefix).middleware(...middleware).group((group) => {
    group.get('/', controllerAction(controller, 'dashboard'));
    group.post('/:resource/bulk', controllerAction(controller, 'bulk'));
    group.post('/:resource/bulk-export', controllerAction(controller, 'bulkExport'));
    group.get('/:resource/create', controllerAction(controller, 'create'));
    group.post('/:resource', controllerAction(controller, 'store'));
    group.get('/:resource/:id/edit', controllerAction(controller, 'edit'));
    group.post('/:resource/:id/delete', controllerAction(controller, 'destroy'));
    group.post('/:resource/:id', controllerAction(controller, 'update'));
    group.get('/:resource/:id', controllerAction(controller, 'show'));
    group.get('/:resource', controllerAction(controller, 'index'));
  });
}