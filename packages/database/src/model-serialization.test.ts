import { describe, expect, it } from 'vitest';
import {
  accessorMethodName,
  readAccessorValue,
  serializeAppendedValue,
} from './model-serialization.js';
import { Model } from './model.js';
import { SqliteConnection } from './sqlite-connection.js';

type PostRow = {
  id: number;
  body: string;
  [key: string]: unknown;
};

class PostWithGetter extends Model<PostRow> {
  static override table = 'posts';
  static override appends = ['rendered_body'];

  get rendered_body(): string {
    return `<p>${this.getAttribute('body')}</p>`;
  }
}

class PostWithAccessorMethod extends Model<PostRow> {
  static override table = 'posts';
  static override appends = ['rendered_body'];

  getRenderedBodyAttribute(): string {
    return `<article>${this.getAttribute('body')}</article>`;
  }
}

class Author extends Model<{ id: number; name: string; [key: string]: unknown }> {
  static override table = 'authors';
}

class PostWithRelation extends Model<PostRow & { author_id?: number }> {
  static override table = 'posts';
  static override appends = ['author'];
}

describe('Model serialization', () => {
  it('exposes accessor helper naming for Laravel-style methods', () => {
    expect(accessorMethodName('rendered_body')).toBe('getRenderedBodyAttribute');
  });

  it('reads class getters and accessor methods', () => {
    const getterPost = new PostWithGetter({ body: 'Hello' });
    const methodPost = new PostWithAccessorMethod({ body: 'Hello' });

    expect(readAccessorValue(getterPost, 'rendered_body', Model.prototype)).toEqual({
      found: true,
      value: '<p>Hello</p>',
    });
    expect(readAccessorValue(methodPost, 'rendered_body', Model.prototype)).toEqual({
      found: true,
      value: '<article>Hello</article>',
    });
  });

  it('includes static appends in toJSON via getters', () => {
    const post = new PostWithGetter({ id: 1, body: 'Markdown' });

    expect(post.toJSON()).toEqual({
      id: 1,
      body: 'Markdown',
      rendered_body: '<p>Markdown</p>',
    });
    expect(JSON.stringify(post)).toBe(
      JSON.stringify({
        id: 1,
        body: 'Markdown',
        rendered_body: '<p>Markdown</p>',
      }),
    );
  });

  it('includes accessor methods declared with getXxxAttribute naming', () => {
    const post = new PostWithAccessorMethod({ id: 2, body: 'Notes' });

    expect(post.toJSON()).toEqual({
      id: 2,
      body: 'Notes',
      rendered_body: '<article>Notes</article>',
    });
  });

  it('supports runtime append() and serializes loaded relations', () => {
    const author = new Author({ id: 9, name: 'Ada' });
    const post = new PostWithRelation({ id: 3, body: 'Draft', author_id: 9 });
    post.setRelation('author', author);
    post.append('author');

    expect(serializeAppendedValue(author)).toEqual({ id: 9, name: 'Ada' });
    expect(post.toJSON()).toEqual({
      id: 3,
      body: 'Draft',
      author_id: 9,
      author: { id: 9, name: 'Ada' },
    });
  });

  it('persists appended accessors through sqlite-backed models', async () => {
    const connection = new SqliteConnection(':memory:');
    PostWithGetter.useConnection(connection);

    await connection.exec(`
      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "body" TEXT NOT NULL
      )
    `);

    const post = await PostWithGetter.create({ body: 'Persisted' });

    expect(post.toJSON()).toEqual({
      id: post.getAttribute('id'),
      body: 'Persisted',
      rendered_body: '<p>Persisted</p>',
    });
  });
});