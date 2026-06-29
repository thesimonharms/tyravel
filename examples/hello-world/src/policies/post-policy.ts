import { Policy } from '@pondoknusa/auth';
import type { Authenticatable } from '@pondoknusa/auth';
import type { Post } from '../models/post.js';

export class PostPolicy extends Policy {
  update(user: Authenticatable, _post: Post): boolean {
    return user.getAuthIdentifier() !== undefined;
  }
}