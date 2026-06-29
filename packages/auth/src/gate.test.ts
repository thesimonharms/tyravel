import { describe, expect, it } from 'vitest';
import { Container } from '@pondoknusa/container';
import { Gate, Policy } from './index.js';
import type { Authenticatable } from './types.js';
import { AuthorizationException } from './authorization-exceptions.js';

class Post {
  id = 1;
}

class PostPolicy extends Policy {
  update(user: Authenticatable, post: Post): boolean {
    return user.getAuthIdentifier() === post.id;
  }
}

const user: Authenticatable = {
  getAuthIdentifier: () => 1,
  getAuthPassword: () => 'x',
};

describe('Gate', () => {
  it('authorizes when policy allows', async () => {
    const container = new Container();
    container.bind(PostPolicy, () => new PostPolicy());
    const gate = new Gate(container, { Post: PostPolicy });

    await expect(gate.authorize(user, 'update', new Post())).resolves.toBeUndefined();
  });

  it('throws when policy denies', async () => {
    const container = new Container();
    container.bind(PostPolicy, () => new PostPolicy());
    const gate = new Gate(container, { Post: PostPolicy });
    const post = new Post();
    post.id = 2;

    await expect(gate.authorize(user, 'update', post)).rejects.toBeInstanceOf(
      AuthorizationException,
    );
  });
});