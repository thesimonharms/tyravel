# API resources

Transform models and paginated results into consistent JSON responses:

```typescript
import { JsonResource } from '@pondoknusa/http';

export class UserResource extends JsonResource<User> {
  toArray() {
    return {
      id: this.resource.getAttribute('id'),
      name: this.resource.getAttribute('name'),
      email: this.resource.getAttribute('email'),
    };
  }
}
```

## Usage

```typescript
// Single resource — wrapped in { data: ... } by default
return UserResource.make(user);

// Collection
return UserResource.collection(users);

// Paginated collection — preserves pagination metadata
const page = await User.query().orderBy('id').paginateModels(request.perPage(), request.page());
return UserResource.collection(page);
```

Disable the default envelope:

```typescript
export class UserResource extends JsonResource<User> {
  static override wrap = null;
  // ...
}
```

Generate a scaffold with `pondoknusa make:resource User`.