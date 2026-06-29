import { cachedFormData, type PondoknusaRequest } from '@pondoknusa/http';
import { parseRuleSet, type ValidationRules } from './rules.js';

export interface ValidationErrors {
  [field: string]: string[];
}

export class ValidationException extends Error {
  constructor(public readonly errors: ValidationErrors) {
    super('The given data was invalid.');
    this.name = 'ValidationException';
  }
}

export class Validator<T extends Record<string, unknown>> {
  constructor(
    private readonly data: Partial<T>,
    private readonly rules: ValidationRules<T>,
  ) {}

  validate(): T {
    const errors: ValidationErrors = {};
    const validated = { ...this.data } as T;

    for (const field of Object.keys(this.rules) as Array<keyof T>) {
      const ruleSet = this.rules[field];
      if (!ruleSet) {
        continue;
      }

      const { sometimes, rules: normalizedRules } = parseRuleSet(ruleSet);
      const fieldPresent = Object.hasOwn(this.data, field);

      if (sometimes && !fieldPresent) {
        continue;
      }

      const value = this.data[field];
      const fieldErrors: string[] = [];

      for (const rule of normalizedRules) {
        const message = rule.validate(value, String(field));
        if (message) {
          fieldErrors.push(message);
        }
      }

      if (fieldErrors.length > 0) {
        errors[String(field)] = fieldErrors;
      } else if (value !== undefined) {
        validated[field] = value as T[keyof T];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors);
    }

    return validated;
  }
}

export async function validateRequest<T extends Record<string, unknown>>(
  request: PondoknusaRequest,
  rules: ValidationRules<T>,
): Promise<T> {
  const contentType = request.headers.get('content-type') ?? '';

  let data: Partial<T> = {};

  if (contentType.includes('application/json')) {
    data = (await request.json()) as Partial<T>;
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = cachedFormData(request) ?? (await request.formData());
    const entries: Record<string, FormDataEntryValue> = {};
    formData.forEach((value, key) => {
      entries[key] = value;
    });
    data = entries as Partial<T>;
  } else {
    for (const field of Object.keys(rules)) {
      const queryValue = request.query(field);
      if (queryValue !== undefined) {
        data[field as keyof T] = queryValue as T[keyof T];
      }
    }
  }

  return new Validator(data, rules).validate();
}