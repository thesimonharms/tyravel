# Validation & form requests

## Inline validation

```typescript
import { validateRequest } from '@pondoknusa/validation';

const data = await validateRequest(request, {
  email: 'required|email',
  age: 'required|integer|min:18',
});
```

Failed validation returns HTTP 422 with an `errors` object.

## Form requests

Form requests combine authorization and validation for controller actions:

```typescript
import { FormRequest, Gate } from '@pondoknusa/core';

export class StoreUserRequest extends FormRequest<{ email: string; name: string }> {
  async authorize(): Promise<boolean> {
    return this.authorizePolicy('create', User);
  }

  rules() {
    return {
      email: ['required', 'email'],
      name: ['required', 'min_length:2'],
    };
  }
}
```

Wire into a route:

```typescript
Route.post('/users', [UserController, 'store', StoreUserRequest]);
```

Generate a scaffold with `pondoknusa make:request StoreUser`.

## Conditional rules

Use `sometimes` to validate a field only when it is present:

```typescript
rules() {
  return {
    email: ['sometimes', 'email'],
    bio: ['sometimes', 'string', 'max:500'],
  };
}
```