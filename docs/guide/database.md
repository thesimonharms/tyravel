# Database & ORM

Register `DatabaseServiceProvider` and configure `config/database.ts`:

```typescript
export default {
  default: 'sqlite',
  connections: {
    sqlite: { driver: 'sqlite', database: 'database/database.sqlite' },
    postgres: {
      driver: 'postgres',
      host: '127.0.0.1',
      database: 'tyravel',
      username: 'postgres',
      password: '',
    },
  },
} as const;
```

## Models

```typescript
export class User extends Model<UserAttributes> {
  static override table = 'users';

  static scopeActive(builder: ModelQueryBuilder) {
    return builder.where('active', 1);
  }
}

const users = await User.all();
const active = await User.scope('active').getModels();
const user = await User.find(1);
```

## Relationships

```typescript
const posts = await user.hasMany(Post).get();
const author = await post.belongsTo(User).get();
const roles = await user.belongsToMany(Role).get();
```

Eager-load to avoid N+1 queries:

```typescript
const users = await User.query().with('posts').getModels();
```

## Migrations

```bash
tyravel make:migration create_posts_table
tyravel migrate
```

```typescript
await schema.create('posts', (table) => {
  table.id();
  table.string('title');
  table.timestamps();
});
```

## Factories & seeders

```bash
tyravel make:factory Post
tyravel make:seeder DatabaseSeeder
tyravel db:seed
```

## Computed attributes

Whitelist accessors in JSON output:

```typescript
export class Post extends Model<PostAttributes> {
  static override appends = ['rendered_body'];

  get rendered_body(): string {
    return markdownToHtml(this.getAttribute('body') ?? '');
  }
}
```