import type { PondoknusaRequest } from '@pondoknusa/http';
import { Response } from '@pondoknusa/http';
import { User } from '../models/user.js';

export class UserController {
  async index() {
    const users = await User.all();
    return Response.json({ users: users.map((user) => user.toJSON()) });
  }

  async show(request: PondoknusaRequest) {
    const user = await User.find(Number(request.param('id')));

    if (!user) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    const posts = await user.posts().get();

    return Response.json({
      user: user.toJSON(),
      posts: posts.map((post) => post.toJSON()),
    });
  }
}