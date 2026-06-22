import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseManager } from './database-manager.js';
import { Model } from './model.js';
import {
  clearMorphMap,
  registerMorphMap,
  resolveMorphAlias,
} from './morph-map.js';
import { QueryProfiler } from './query-profiler.js';
import type { MorphManyRelation } from './relations/morph-many.js';
import type { MorphToRelation } from './relations/morph-to.js';
import { SqliteConnection } from './sqlite-connection.js';

type PostRow = {
  id: number;
  title: string;
  [key: string]: unknown;
};

type VideoRow = {
  id: number;
  title: string;
  [key: string]: unknown;
};

type CommentRow = {
  id: number;
  body: string;
  commentable_type: string;
  commentable_id: number;
  [key: string]: unknown;
};

type UserRow = {
  id: number;
  name: string;
  [key: string]: unknown;
};

type RoleRow = {
  id: number;
  name: string;
  [key: string]: unknown;
};

class Post extends Model<PostRow> {
  static override table = 'posts';
  static override morphName = 'post';

  comments(): MorphManyRelation<Comment> {
    return this.morphMany(Comment, 'commentable');
  }
}

class Video extends Model<VideoRow> {
  static override table = 'videos';
  static override morphName = 'video';

  comments(): MorphManyRelation<Comment> {
    return this.morphMany(Comment, 'commentable');
  }
}

class Comment extends Model<CommentRow> {
  static override table = 'comments';

  commentable(): MorphToRelation<Post | Video> {
    return this.morphTo('commentable');
  }
}

class User extends Model<UserRow> {
  static override table = 'users';

  roles() {
    return this.belongsToMany(Role)
      .withPivot('expires_at', 'active')
      .withPivotCasts({ expires_at: 'datetime', active: 'boolean' });
  }
}

class Role extends Model<RoleRow> {
  static override table = 'roles';
}

describe('ORM enhancements', () => {
  const connection = new SqliteConnection(':memory:');

  beforeAll(async () => {
    Post.useConnection(connection);
    Video.useConnection(connection);
    Comment.useConnection(connection);
    User.useConnection(connection);
    Role.useConnection(connection);

    registerMorphMap({
      post: Post,
      video: Video,
    });

    await connection.exec(`
      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL
      );
      CREATE TABLE "videos" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL
      );
      CREATE TABLE "comments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "body" TEXT NOT NULL,
        "commentable_type" TEXT NOT NULL,
        "commentable_id" INTEGER NOT NULL
      );
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL
      );
      CREATE TABLE "roles" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL
      );
      CREATE TABLE "user_role" (
        "user_id" INTEGER NOT NULL,
        "role_id" INTEGER NOT NULL,
        "expires_at" INTEGER,
        "active" INTEGER NOT NULL DEFAULT 1
      );
    `);
  });

  afterEach(() => {
    QueryProfiler.disable();
    QueryProfiler.reset();
  });

  it('resolves morph aliases from model morphName', () => {
    expect(resolveMorphAlias(Post)).toBe('post');
    expect(resolveMorphAlias(Video)).toBe('video');
  });

  it('loads morphMany related models', async () => {
    const post = await Post.create({ title: 'Hello' });
    await Comment.create({
      body: 'Nice post',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });
    await Comment.create({
      body: 'Great read',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });

    const comments = await post.comments().get();
    expect(comments).toHaveLength(2);
    expect(comments.map((comment) => comment.getAttribute('body'))).toEqual([
      'Nice post',
      'Great read',
    ]);
  });

  it('loads morphTo parent models via morph map', async () => {
    const post = await Post.create({ title: 'Morph target' });
    const comment = await Comment.create({
      body: 'On a post',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });

    const parent = await comment.commentable().get();
    expect(parent?.getAttribute('title')).toBe('Morph target');
  });

  it('eager loads morphTo without mixing types that share ids', async () => {
    const post = await Post.create({ title: 'Post parent' });
    const video = await Video.create({ title: 'Video parent' });

    await Comment.create({
      body: 'Post comment',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });
    await Comment.create({
      body: 'Video comment',
      commentable_type: 'video',
      commentable_id: video.getAttribute('id')!,
    });

    const comments = await Comment.query()
      .whereIn('body', ['Post comment', 'Video comment'])
      .with('commentable')
      .getModels<Comment>();
    expect(comments).toHaveLength(2);

    const postComment = comments.find(
      (comment) => comment.getAttribute('body') === 'Post comment',
    );
    const videoComment = comments.find(
      (comment) => comment.getAttribute('body') === 'Video comment',
    );

    expect(postComment?.getRelation<Post>('commentable')?.getAttribute('title')).toBe(
      'Post parent',
    );
    expect(
      videoComment?.getRelation<Video>('commentable')?.getAttribute('title'),
    ).toBe('Video parent');
  });

  it('eager loads morphMany relations', async () => {
    const post = await Post.create({ title: 'Eager post' });
    await Comment.create({
      body: 'First',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });
    await Comment.create({
      body: 'Second',
      commentable_type: 'post',
      commentable_id: post.getAttribute('id')!,
    });

    const loadedPost = await Post.query()
      .where('title', 'Eager post')
      .with('comments')
      .firstModel<Post>();
    expect(loadedPost).not.toBeNull();
    expect(loadedPost!.getRelation<Comment[]>('comments')).toHaveLength(2);
  });

  it('loads pivot attributes with casts on belongsToMany', async () => {
    const user = await User.create({ name: 'Pivot user' });
    const admin = await Role.create({ name: 'admin' });
    const expiresAt = Math.floor(new Date('2026-06-22T12:00:00Z').getTime() / 1000);

    await connection.query(
      'INSERT INTO "user_role" ("user_id", "role_id", "expires_at", "active") VALUES (?, ?, ?, ?)',
      [user.getAttribute('id')!, admin.getAttribute('id')!, expiresAt, 0],
    );

    const roles = await user.roles().get();
    expect(roles).toHaveLength(1);
    const role = roles[0]!;
    expect(role.getAttribute('name')).toBe('admin');

    const pivot = role.getPivot()!;
    expect(pivot.getAttribute('expires_at')).toBeInstanceOf(Date);
    expect((pivot.getAttribute('expires_at') as Date).toISOString()).toBe(
      '2026-06-22T12:00:00.000Z',
    );
    expect(pivot.getAttribute('active')).toBe(false);
  });

  it('eager loads pivot attributes on belongsToMany', async () => {
    const user = await User.create({ name: 'Eager pivot' });
    const editor = await Role.create({ name: 'editor' });

    await connection.query(
      'INSERT INTO "user_role" ("user_id", "role_id", "expires_at", "active") VALUES (?, ?, ?, ?)',
      [user.getAttribute('id')!, editor.getAttribute('id')!, null, 1],
    );

    const loadedUser = await User.query()
      .where('name', 'Eager pivot')
      .with('roles')
      .firstModel<User>();
    expect(loadedUser).not.toBeNull();
    const role = loadedUser!.getRelation<Role[]>('roles')![0]!;
    expect(role.getAttribute('name')).toBe('editor');
    expect(role.getPivot()!.getAttribute('active')).toBe(true);
  });

  it('profiles queries through DatabaseManager connections', async () => {
    clearMorphMap();

    const manager = new DatabaseManager({
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', database: ':memory:' },
      },
    });

    QueryProfiler.enable();
    const conn = manager.connection();
    await conn.query('SELECT 1');
    await conn.query('SELECT 2');

    const queries = QueryProfiler.getQueries();
    expect(queries).toHaveLength(2);
    expect(queries[0]!.sql).toBe('SELECT 1');
    expect(queries[1]!.sql).toBe('SELECT 2');
    expect(queries[0]!.durationMs).toBeGreaterThanOrEqual(0);

    await manager.close();
  });
});