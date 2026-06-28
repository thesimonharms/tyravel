import { Policy } from '@tyravel/auth';
import type { Authenticatable } from '@tyravel/auth';

export class PostPolicy extends Policy {
  update(user: Authenticatable, _post: unknown): boolean {
    return user.getAuthIdentifier() !== undefined;
  }
}
