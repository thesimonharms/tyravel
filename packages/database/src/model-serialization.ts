import type { Model } from './model.js';

export function snakeToStudly(value: string): string {
  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function accessorMethodName(attribute: string): string {
  return `get${snakeToStudly(attribute)}Attribute`;
}

export function findPrototypeGetter(
  instance: object,
  key: string,
  stopAt: object,
): (() => unknown) | undefined {
  let current = Object.getPrototypeOf(instance);

  while (current && current !== stopAt) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor?.get) {
      return descriptor.get.bind(instance) as () => unknown;
    }
    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

export function readAccessorValue(
  instance: object,
  attribute: string,
  stopAt: object,
): { found: boolean; value: unknown } {
  const getter = findPrototypeGetter(instance, attribute, stopAt);
  if (getter) {
    return { found: true, value: getter() };
  }

  const methodName = accessorMethodName(attribute);
  const method = (instance as Record<string, unknown>)[methodName];
  if (typeof method === 'function') {
    return { found: true, value: method.call(instance) };
  }

  return { found: false, value: undefined };
}

export function serializeAppendedValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeAppendedValue(item));
  }

  if (
    typeof value === 'object' &&
    'toJSON' in value &&
    typeof (value as Model).toJSON === 'function'
  ) {
    return (value as Model).toJSON();
  }

  return value;
}