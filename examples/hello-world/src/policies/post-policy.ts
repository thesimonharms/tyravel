import { Policy } from '@tyravel/auth';
import type { Authenticatable } from '@tyravel/auth';
import type { Post } from '../models/post.js';

export class PostPolicy extends Policy {
  update(user: Authenticatable, _post: Post): boolean {
    return user.getAuthIdentifier() !== undefined;
  }
}