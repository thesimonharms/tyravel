import { Policy } from '@pondoknusa/auth';
import type { Authenticatable } from '@pondoknusa/auth';

export class PostPolicy extends Policy {
  update(user: Authenticatable, _post: unknown): boolean {
    return user.getAuthIdentifier() !== undefined;
  }
}
