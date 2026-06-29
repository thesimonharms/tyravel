import type { ModelStatic } from '@pondoknusa/database';
import { createRouteBinding, type RouteBinding } from '@pondoknusa/http';

function normalizeRouteId(value: string): string | number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(parsed) === value ? parsed : value;
}

export function modelRouteBinding(model: ModelStatic): RouteBinding {
  return createRouteBinding(async (value) => {
    const record = await model.find(normalizeRouteId(value));
    return record;
  });
}

export function implicitBindingParameter(model: ModelStatic): string {
  const name = model.name;
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}