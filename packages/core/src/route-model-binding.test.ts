import { describe, expect, it } from 'vitest';
import { Model } from '@pondoknusa/database';
import { Response } from '@pondoknusa/http';
import { SqliteConnection } from '@pondoknusa/database';
import { Application, HttpKernel, Route, setRouteApplication } from './index.js';

type PostRow = { id: number; title: string; [key: string]: unknown };

class Post extends Model<PostRow> {
  static override table = 'posts';
}

describe('Route model binding', () => {
  it('binds models via Route.bind and Route.implicitModels', async () => {
    const connection = new SqliteConnection(':memory:');
    Post.useConnection(connection);
    await connection.exec(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
      );
    `);
    const post = await Post.create({ title: 'Hello' });

    const app = new Application('/tmp/route-binding');
    setRouteApplication(app);
    Route.implicitModels(Post);
    Route.get('/posts/{post}', (request) => {
      const bound = request.routeModel<Post>('post');
      return Response.json({ id: bound?.getAttribute('id'), title: bound?.getAttribute('title') });
    });

    const kernel = new HttpKernel(app);
    const response = await kernel.handle(
      new Request(`http://localhost/posts/${post.getAttribute('id')}`),
    );

    expect(await response.json()).toEqual({
      id: post.getAttribute('id'),
      title: 'Hello',
    });
  });

  it('returns 404 for missing implicit bindings', async () => {
    const connection = new SqliteConnection(':memory:');
    Post.useConnection(connection);
    await connection.exec(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
      );
    `);

    const app = new Application('/tmp/route-binding-missing');
    setRouteApplication(app);
    Route.implicitModels(Post);
    Route.get('/posts/{post}', () => Response.text('ok'));

    const kernel = new HttpKernel(app);
    const response = await kernel.handle(new Request('http://localhost/posts/999'));
    expect(response.status).toBe(404);
  });
});