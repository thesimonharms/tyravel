export { projectPackageJson } from './stubs-project.js';

export function projectConfig(name: string): string {
  return JSON.stringify(
    {
      name,
      entry: 'src/main.ts',
      serve: {
        port: 3000,
        hostname: '127.0.0.1',
      },
    },
    null,
    2,
  );
}

export { mainEntry } from './stubs-project.js';

export function middleware(name: string): string {
  return `import type { Middleware } from '@tyravel/http';
import type { TyravelRequest } from '@tyravel/http';

export const ${name}Middleware: Middleware = async (request, next) => {
  return next();
};
`;
}

export function consoleCommand(name: string, signature: string): string {
  return `export class ${name}Command {
  readonly name = '${signature}';
  readonly description = 'TODO: describe this command';

  async handle(_args: string[]): Promise<number> {
    console.log('${name} command executed.');
    return 0;
  }
}
`;
}

export function appConfig(name: string): string {
  return `import { env, s } from '@tyravel/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
  debug: s.boolean(),
  url: s.string({ url: true }),
  locale: s.string({ minLength: 2 }),
  fallback_locale: s.string({ minLength: 2 }),
  faker_locale: s.string({ minLength: 2 }),
});

export default {
  name: env('APP_NAME', '${name}'),
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
  locale: env('APP_LOCALE', 'en'),
  fallback_locale: env('APP_FALLBACK_LOCALE', 'en'),
  faker_locale: env('APP_FAKER_LOCALE', 'en'),
  locales_path: 'lang',
  available_locales: ['en'],
} as const;
`;
}

export function defaultLocaleFile(): string {
  return JSON.stringify(
    {
      messages: {
        welcome: 'Welcome to Tyravel',
      },
    },
    null,
    2,
  );
}

export function viewsConfig(): string {
  return `export default {
  path: 'resources/views',
  extension: '.tyr',
  compiledPath: 'storage/framework/views',
  locale: 'en',
  localesPath: 'lang',
} as const;
`;
}

export function islandViewPartial(id: string): string {
  return `<div class="island island-${id}">
  <p>${id} island</p>
</div>
`;
}

export function islandProgrammaticView(id: string): string {
  return `export function render(ctx: Record<string, unknown>) {
  const label = String(ctx.label ?? '${id}');
  return '<button type="button" class="island-${id}">' + label + '</button>';
}

export function mount({ element, props }: {
  element: { querySelector(selectors: string): Element | null };
  props: Record<string, unknown>;
}) {
  const button = element.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  let count = Number(props.count ?? 0);
  button.textContent = String(count);

  const onClick = () => {
    count += 1;
    button.textContent = String(count);
  };

  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
}
`;
}

export function islandClientMount(id: string): string {
  return `import { registerIsland } from '@tyravel/ssr';

registerIsland('${id}', ({ element, props }) => {
  // TODO: mount interactive behavior on \`element\` using \`props\`
});
`;
}

export function componentView(name: string): string {
  return `@props([])

<div class="component component-${name}" {!! $attributes !!}>
  {!! $slot !!}
</div>
`;
}

export function componentClass(className: string, tagName: string): string {
  return `import type { ViewContext } from '@tyravel/views';

export class ${className} {
  readonly tag = '${tagName}';

  data(_context: ViewContext): Record<string, unknown> {
    return {};
  }
}
`;
}

export { databaseConfig } from './stubs-project.js';

export function appServiceProvider(): string {
  return `import { ServiceProvider } from '@tyravel/core';

export class AppServiceProvider extends ServiceProvider {
  override async register() {
    this.app.instance('app.name', 'Tyravel');
  }
}
`;
}

export function webRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { Response } from '@tyravel/http';

Route.get('/', (request) =>
  Response.json({
    message: 'Welcome to Tyravel',
    path: request.path,
  }),
);
`;
}

export function controller(name: string): string {
  const className = `${name}Controller`;

  return `import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';

export class ${className} {
  index(_request: TyravelRequest) {
    return Response.json({
      message: '${className}@index',
    });
  }

  show(request: TyravelRequest) {
    return Response.json({
      message: '${className}@show',
      id: request.param('id'),
    });
  }
}
`;
}

export function invokableController(name: string): string {
  const className = `${name}Controller`;

  return `import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';

export class ${className} {
  async __invoke(_request: TyravelRequest) {
    return Response.json({
      message: '${className}',
    });
  }
}
`;
}

export function apiResourceController(name: string): string {
  const className = `${name}Controller`;
  const parameter = name.charAt(0).toLowerCase() + name.slice(1);
  const table = `${parameter}s`;

  return `import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';
import { ${name}, type ${name} } from '../models/${name}.js';

export class ${className} {
  async index() {
    const records = await ${name}.all();
    return Response.json(records.map((record) => record.toJSON()));
  }

  async show(request: TyravelRequest) {
    const ${parameter} = request.routeModel<${name}>('${parameter}');
    return Response.json(${parameter}?.toJSON() ?? null);
  }

  async store(request: TyravelRequest) {
    const record = await ${name}.create(await request.json());
    return Response.json(record.toJSON(), { status: 201 });
  }

  async update(request: TyravelRequest) {
    const ${parameter} = request.routeModel<${name}>('${parameter}');
    if (!${parameter}) {
      return Response.json({ message: 'Not found.' }, { status: 404 });
    }

    await ${parameter}.update(await request.json());
    return Response.json(${parameter}.toJSON());
  }

  async destroy(request: TyravelRequest) {
    const ${parameter} = request.routeModel<${name}>('${parameter}');
    if (!${parameter}) {
      return Response.json({ message: 'Not found.' }, { status: 404 });
    }

    await ${parameter}.delete();
    return Response.noContent();
  }
}
`;
}

export function apiResourceRouteHint(name: string, invokable = false): string {
  const className = `${name}Controller`;
  const parameter = name.charAt(0).toLowerCase() + name.slice(1);
  const path = `${parameter}s`;

  if (invokable) {
    return `Route.implicitModels(${name});
Route.get('/${path}/{${parameter}}', ${className}).name('${path}.show');`;
  }

  return `Route.implicitModels(${name});
Route.group({ prefix: 'api', as: 'api.' }, () => {
  Route.get('/${path}', [${className}, 'index']).name('${path}.index');
  Route.get('/${path}/{${parameter}}', [${className}, 'show']).name('${path}.show');
  Route.post('/${path}', [${className}, 'store']).name('${path}.store');
  Route.put('/${path}/{${parameter}}', [${className}, 'update']).name('${path}.update');
  Route.delete('/${path}/{${parameter}}', [${className}, 'destroy']).name('${path}.destroy');
});`;
}

export function apiResource(name: string): string {
  const className = name.endsWith('Resource') ? name : `${name}Resource`;

  return `import { JsonResource } from '@tyravel/http';

export class ${className} extends JsonResource {
  toArray() {
    return {
      id: (this.resource as { id?: unknown }).id,
    };
  }
}
`;
}

export function formRequest(name: string): string {
  const className = name.endsWith('Request') ? name : `${name}Request`;

  return `import { FormRequest } from '@tyravel/core';

export class ${className} extends FormRequest {
  authorize(): boolean {
    return true;
  }

  rules() {
    return {
      //
    };
  }
}
`;
}

export function model(name: string, keyType: 'int' | 'uuid' | 'ulid' = 'int'): string {
  const table = `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;

  if (keyType === 'uuid') {
    return `import { HasUuids } from '@tyravel/database';

export interface ${name}Attributes {
  id: string;
}

export class ${name} extends HasUuids<${name}Attributes> {
  static override table = '${table}';
}
`;
  }

  if (keyType === 'ulid') {
    return `import { HasUlids } from '@tyravel/database';

export interface ${name}Attributes {
  id: string;
}

export class ${name} extends HasUlids<${name}Attributes> {
  static override table = '${table}';
}
`;
  }

  return `import { Model } from '@tyravel/database';

export interface ${name}Attributes {
  id: number;
}

export class ${name} extends Model<${name}Attributes> {
  static override table = '${table}';
}
`;
}

export function uuidModelMigration(tableName: string): string {
  return `import { Migration } from '@tyravel/database';

export default class Create${tableName.charAt(0).toUpperCase()}${tableName.slice(1)}Table extends Migration {
  async up(): Promise<void> {
    await this.schema.create('${tableName}', (table) => {
      table.uuid('id');
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await this.schema.drop('${tableName}');
  }
}
`;
}

export function ulidModelMigration(tableName: string): string {
  return `import { Migration } from '@tyravel/database';

export default class Create${tableName.charAt(0).toUpperCase()}${tableName.slice(1)}Table extends Migration {
  async up(): Promise<void> {
    await this.schema.create('${tableName}', (table) => {
      table.ulid('id');
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await this.schema.drop('${tableName}');
  }
}
`;
}

export function factory(modelName: string): string {
  const factoryName = `${modelName}Factory`;
  const exportName = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}Factory`;

  return `import { Factory, fakeEmail, fakeName } from '@tyravel/database';
import { ${modelName}, type ${modelName}Attributes } from '../../src/models/${modelName}.js';

export class ${factoryName} extends Factory<${modelName}, ${modelName}Attributes> {
  protected readonly ModelClass = ${modelName};

  definition(): Partial<${modelName}Attributes> {
    return {
      name: fakeName(),
      email: fakeEmail(),
    };
  }
}

export const ${exportName} = new ${factoryName}();
`;
}

export function seeder(className: string): string {
  return `import { Seeder } from '@tyravel/database';

export class ${className} extends Seeder {
  override async run(): Promise<void> {
    //
  }
}
`;
}

export function databaseSeeder(): string {
  return seeder('DatabaseSeeder');
}

export function migration(className: string): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class ${className} extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    //
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    //
  }
}
`;
}

export function view(name: string): string {
  return `@layout('layouts.app')

@section('title')
  ${name}
@endsection

@section('content')
  <h1>${name}</h1>
@endsection
`;
}

export function layoutView(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>@yield('title', 'Tyravel')</title>
  @stack('styles')
</head>
<body>
  @yield('content')
  @stack('scripts')
  @echo
</body>
</html>
`;
}

export function provider(name: string): string {
  const className = `${name}ServiceProvider`;

  return `import { ServiceProvider } from '@tyravel/core';

export class ${className} extends ServiceProvider {
  override async register() {
    //
  }

  override async boot() {
    //
  }
}
`;
}

export function mcpTool(name: string): string {
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  return `import type { McpTool } from '@tyravel/mcp';

export const ${camel}Tool: McpTool = {
  name: '${camel}',
  description: 'Describe what ${camel} does for agents.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    return { ok: true };
  },
};
`;
}

export function job(name: string): string {
  return `import { Job } from '@tyravel/queue';

export interface ${name}Payload {
  //
}

export class ${name} extends Job<${name}Payload> {
  override async handle(): Promise<void> {
    //
  }
}
`;
}

export { queueConfig } from './stubs-project.js';

export function pgvectorExtensionMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import { ensurePgVectorExtension } from '@tyravel/vector-pg';

export default class EnablePgVectorExtension extends Migration {
  override async up(connection: DatabaseConnection) {
    await ensurePgVectorExtension(connection);
  }

  override async down(connection: DatabaseConnection) {
    await connection.exec('DROP EXTENSION IF EXISTS vector');
  }
}
`;
}

export function jobsTableMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateJobsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('jobs', (table) => {
      table.id();
      table.string('queue');
      table.text('payload');
      table.integer('attempts');
      table.integer('reserved_at').nullable();
      table.integer('available_at');
      table.integer('created_at');
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('jobs');
  }
}
`;
}

export function domainEvent(name: string): string {
  return `import { Event } from '@tyravel/events';

export interface ${name}Payload {
  //
}

export class ${name} extends Event<${name}Payload> {}
`;
}

export function eventListener(name: string): string {
  return `import { Listener } from '@tyravel/events';
import type { Event } from '@tyravel/events';

export class ${name} extends Listener<Event> {
  override async handle(_event: Event): Promise<void> {
    //
  }
}
`;
}

export function eventsConfig(): string {
  return `import type { EventsConfig } from '@tyravel/events';

export default {
  listen: [],
  subscribers: [],
  queueConnection: 'database',
  queue: 'default',
} satisfies EventsConfig;
`;
}

export function failedJobsTableMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateFailedJobsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('failed_jobs', (table) => {
      table.id();
      table.string('uuid');
      table.string('connection');
      table.string('queue');
      table.text('payload');
      table.text('exception');
      table.integer('failed_at');
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('failed_jobs');
  }
}
`;
}

export function eventSubscriber(name: string): string {
  return `import { EventSubscriber } from '@tyravel/events';
import type { EventDispatcher } from '@tyravel/events';

export class ${name} extends EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    // dispatcher.listen(SomeEvent, SomeListener);
  }
}
`;
}

export function authConfig(): string {
  return `import type { AuthConfig } from '@tyravel/auth';
import { env } from '@tyravel/config';
import { User } from '../src/models/User.js';

export default {
  defaults: {
    guard: 'web',
  },
  guards: {
    web: {
      driver: 'session',
      provider: 'users',
    },
    api: {
      driver: 'token',
      provider: 'users',
    },
  },
  providers: {
    users: {
      driver: 'eloquent',
      model: User,
    },
  },
  session: {
    driver: 'database',
    cookie: 'tyravel_session',
    lifetimeMinutes: 120,
    secure: env('SESSION_SECURE', 'false') === 'true',
    table: 'sessions',
    connection: 'sqlite',
  },
  passwords: {
    users: {
      provider: 'users',
      table: 'password_reset_tokens',
      expireMinutes: 60,
      connection: 'sqlite',
    },
  },
  tokens: {
    table: 'personal_access_tokens',
    connection: 'sqlite',
    prefix: 'tyr_',
    prefixLength: 8,
  },
  oauth: {
    accountsTable: 'oauth_accounts',
    connection: 'sqlite',
    providers: {
      github: {
        clientId: env('GITHUB_CLIENT_ID', ''),
        clientSecret: env('GITHUB_CLIENT_SECRET', ''),
        redirectUri: env('GITHUB_REDIRECT_URI', 'http://127.0.0.1:3000/auth/github/callback'),
        scopes: ['user:email'],
      },
      google: {
        clientId: env('GOOGLE_CLIENT_ID', ''),
        clientSecret: env('GOOGLE_CLIENT_SECRET', ''),
        redirectUri: env('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:3000/auth/google/callback'),
      },
      discord: {
        clientId: env('DISCORD_CLIENT_ID', ''),
        clientSecret: env('DISCORD_CLIENT_SECRET', ''),
        redirectUri: env('DISCORD_REDIRECT_URI', 'http://127.0.0.1:3000/auth/discord/callback'),
        scopes: ['identify', 'email'],
      },
      microsoft: {
        clientId: env('MICROSOFT_CLIENT_ID', ''),
        clientSecret: env('MICROSOFT_CLIENT_SECRET', ''),
        redirectUri: env('MICROSOFT_REDIRECT_URI', 'http://127.0.0.1:3000/auth/microsoft/callback'),
      },
      x: {
        clientId: env('X_CLIENT_ID', ''),
        clientSecret: env('X_CLIENT_SECRET', ''),
        redirectUri: env('X_REDIRECT_URI', 'http://127.0.0.1:3000/auth/x/callback'),
      },
      facebook: {
        clientId: env('FACEBOOK_CLIENT_ID', ''),
        clientSecret: env('FACEBOOK_CLIENT_SECRET', ''),
        redirectUri: env('FACEBOOK_REDIRECT_URI', 'http://127.0.0.1:3000/auth/facebook/callback'),
      },
      linkedin: {
        clientId: env('LINKEDIN_CLIENT_ID', ''),
        clientSecret: env('LINKEDIN_CLIENT_SECRET', ''),
        redirectUri: env('LINKEDIN_REDIRECT_URI', 'http://127.0.0.1:3000/auth/linkedin/callback'),
      },
      apple: {
        clientId: env('APPLE_CLIENT_ID', ''),
        clientSecret: env('APPLE_CLIENT_SECRET', ''),
        redirectUri: env('APPLE_REDIRECT_URI', 'http://127.0.0.1:3000/auth/apple/callback'),
        teamId: env('APPLE_TEAM_ID', ''),
        keyId: env('APPLE_KEY_ID', ''),
        privateKey: env('APPLE_PRIVATE_KEY', ''),
      },
      gitlab: {
        clientId: env('GITLAB_CLIENT_ID', ''),
        clientSecret: env('GITLAB_CLIENT_SECRET', ''),
        redirectUri: env('GITLAB_REDIRECT_URI', 'http://127.0.0.1:3000/auth/gitlab/callback'),
        scopes: ['read_user'],
      },
      slack: {
        clientId: env('SLACK_CLIENT_ID', ''),
        clientSecret: env('SLACK_CLIENT_SECRET', ''),
        redirectUri: env('SLACK_REDIRECT_URI', 'http://127.0.0.1:3000/auth/slack/callback'),
        scopes: ['openid', 'profile', 'email'],
      },
      spotify: {
        clientId: env('SPOTIFY_CLIENT_ID', ''),
        clientSecret: env('SPOTIFY_CLIENT_SECRET', ''),
        redirectUri: env('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:3000/auth/spotify/callback'),
      },
      twitch: {
        clientId: env('TWITCH_CLIENT_ID', ''),
        clientSecret: env('TWITCH_CLIENT_SECRET', ''),
        redirectUri: env('TWITCH_REDIRECT_URI', 'http://127.0.0.1:3000/auth/twitch/callback'),
      },
      bitbucket: {
        clientId: env('BITBUCKET_CLIENT_ID', ''),
        clientSecret: env('BITBUCKET_CLIENT_SECRET', ''),
        redirectUri: env('BITBUCKET_REDIRECT_URI', 'http://127.0.0.1:3000/auth/bitbucket/callback'),
      },
    },
  },
  policies: {},
} satisfies AuthConfig;
`;
}

export function userModel(): string {
  return `import { Model } from '@tyravel/database';
import type { Authenticatable } from '@tyravel/auth';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
}

export class User extends Model<UserAttributes> implements Authenticatable {
  static override table = 'users';

  getAuthIdentifier(): number {
    return Number(this.get('id'));
  }

  getAuthPassword(): string {
    return String(this.get('password'));
  }
}
`;
}

export function usersTableMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateUsersTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('users', (table) => {
      table.id();
      table.string('name');
      table.string('email');
      table.string('password');
      table.integer('created_at').nullable();
      table.integer('updated_at').nullable();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('users');
  }
}
`;
}

export function sessionsTableMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateSessionsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('sessions', (table) => {
      table.string('id', 128);
      table.unique('id');
      table.integer('user_id').nullable();
      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      table.text('payload');
      table.integer('last_activity');
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('sessions');
  }
}
`;
}

export function passwordResetTokensMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreatePasswordResetTokensTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('password_reset_tokens', (table) => {
      table.string('email');
      table.string('token');
      table.integer('created_at');
      table.unique('email');
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('password_reset_tokens');
  }
}
`;
}

export function personalAccessTokensMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreatePersonalAccessTokensTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('personal_access_tokens', (table) => {
      table.id();
      table.string('tokenable_type');
      table.integer('tokenable_id');
      table.string('name');
      table.string('token', 64);
      table.string('token_prefix').nullable();
      table.text('abilities').nullable();
      table.integer('last_used_at').nullable();
      table.string('last_used_ip').nullable();
      table.integer('expires_at').nullable();
      table.integer('revoked_at').nullable();
      table.text('ip_whitelist').nullable();
      table.integer('created_at').nullable();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('personal_access_tokens');
  }
}
`;
}

export function oauthAccountsMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateOauthAccountsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('oauth_accounts', (table) => {
      table.id();
      table.integer('user_id');
      table.string('provider');
      table.string('provider_user_id');
      table.string('email').nullable();
      table.string('avatar').nullable();
      table.integer('created_at').nullable();
      table.unique(['provider', 'provider_user_id']);
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('oauth_accounts');
  }
}
`;
}

export function socialDriverStub(providerName: string, className: string): string {
  return `import type {
  OAuthAuthorizeContext,
  OAuthExchangeContext,
  OAuthProviderConfig,
  OAuthUserProfile,
  SocialOAuthDriver,
} from '@tyravel/auth';

export class ${className} implements SocialOAuthDriver {
  readonly name = '${providerName}';
  readonly usesPkce = true;

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string, context?: OAuthAuthorizeContext): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['openid', 'profile', 'email']).join(' '),
      state,
    });

    if (context?.codeChallenge) {
      params.set('code_challenge', context.codeChallenge);
      params.set('code_challenge_method', context.codeChallengeMethod ?? 'S256');
    }

    return \`https://provider.example/oauth/authorize?\${params}\`;
  }

  async exchangeCode(code: string, context?: OAuthExchangeContext): Promise<OAuthUserProfile> {
    void code;
    void context;
    throw new Error('Implement token exchange for ${className}.');
  }
}
`;
}

export function postPolicyStub(): string {
  return `import { Policy } from '@tyravel/auth';
import type { Authenticatable } from '@tyravel/auth';

export class PostPolicy extends Policy {
  update(user: Authenticatable, _post: unknown): boolean {
    return user.getAuthIdentifier() !== undefined;
  }
}
`;
}

export function authController(): string {
  return `import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';
import { Auth, Password } from '@tyravel/core';
import type { Application } from '@tyravel/core';
import { OAuthManager } from '@tyravel/auth';

export class AuthController {
  constructor(private readonly app: Application) {}

  async login(request: TyravelRequest) {
    const body = await request.json<{ email?: string; password?: string }>();
    await Auth.attempt({
      email: body.email ?? '',
      password: body.password ?? '',
    });

    return Response.json({
      user: {
        id: Auth.id(),
      },
    });
  }

  async logout(_request: TyravelRequest) {
    await Auth.logout();
    return Response.json({ message: 'Logged out.' });
  }

  me(request: TyravelRequest) {
    return Response.json({
      user: request.user,
    });
  }

  async forgotPassword(request: TyravelRequest) {
    const body = await request.json<{ email?: string }>();
    await Password.sendResetLink(body.email ?? '');
    return Response.json({
      message: 'If that email exists, a reset link has been sent.',
    });
  }

  async resetPassword(request: TyravelRequest) {
    const body = await request.json<{
      email?: string;
      token?: string;
      password?: string;
    }>();
    await Password.reset({
      email: body.email ?? '',
      token: body.token ?? '',
      password: body.password ?? '',
    });
    return Response.json({ message: 'Password has been reset.' });
  }

  async createToken(request: TyravelRequest) {
    const body = await request.json<{
      name?: string;
      abilities?: string[];
      expiresIn?: string;
      ipWhitelist?: string[];
    }>();
    const token = await Auth.createToken(body.name ?? 'api', body.abilities, {
      expiresIn: body.expiresIn,
      ipWhitelist: body.ipWhitelist,
    });
    return Response.json({
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      plainTextToken: token.plainTextToken,
      abilities: token.abilities,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    });
  }

  async revokeToken(request: TyravelRequest) {
    const tokenId = Number(request.param('id'));
    const revoked = await Auth.revokeToken(tokenId);
    if (!revoked) {
      return Response.json({ message: 'Token not found.' }, { status: 404 });
    }
    return Response.json({ message: 'Token revoked.' });
  }

  oauthRedirect(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const state = oauth.createState();
    request.session?.put(\`oauth.\${provider}.state\`, state);

    const authorize: { codeChallenge?: string; codeChallengeMethod?: 'S256' } = {};
    if (oauth.driverUsesPkce(provider)) {
      const pkce = oauth.createPkcePair();
      request.session?.put(\`oauth.\${provider}.pkce_verifier\`, pkce.verifier);
      authorize.codeChallenge = pkce.challenge;
      authorize.codeChallengeMethod = pkce.method;
    }

    const url = oauth.redirectUrl(provider, state, authorize);
    return Response.redirect(url, 302);
  }

  async oauthCallback(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const url = new URL(request.url);
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const expected = request.session?.get<string>(\`oauth.\${provider}.state\`);
    if (!expected || expected !== state) {
      return Response.json({ message: 'Invalid OAuth state.' }, { status: 422 });
    }

    const codeVerifier = request.session?.get<string>(\`oauth.\${provider}.pkce_verifier\`);
    const profile = await oauth.handleCallback(provider, code, { codeVerifier });
    const user = await oauth.findOrCreateUser(provider, profile);
    await Auth.login(user);
    return Response.redirect('/', 302);
  }
}
`;
}

export function authRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { AuthController } from '../controllers/AuthController.js';

Route.middleware(['csrf', 'guest']).post('/login', [AuthController, 'login']);
Route.middleware(['csrf', 'auth']).post('/logout', [AuthController, 'logout']);
Route.middleware('auth').get('/me', [AuthController, 'me']);
Route.middleware(['csrf', 'guest']).post('/forgot-password', [AuthController, 'forgotPassword']);
Route.middleware(['csrf', 'guest']).post('/reset-password', [AuthController, 'resetPassword']);
Route.middleware(['csrf', 'auth']).post('/tokens', [AuthController, 'createToken']);
Route.middleware(['csrf', 'auth']).delete('/tokens/:id', [AuthController, 'revokeToken']);
Route.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
Route.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
`;
}

export function oauthServerMigration(): string {
  return `import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateOauthServerTables extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('oauth_clients', (table) => {
      table.id();
      table.string('client_id');
      table.string('name');
      table.string('secret').nullable();
      table.text('redirect_uris');
      table.text('grants');
      table.text('scopes');
      table.integer('revoked').default(0);
      table.integer('created_at').nullable();
      table.unique(['client_id']);
    });

    await schema.create('oauth_auth_codes', (table) => {
      table.id();
      table.string('client_id');
      table.integer('user_id');
      table.text('scopes');
      table.string('code', 64);
      table.string('code_challenge').nullable();
      table.string('code_challenge_method').nullable();
      table.string('redirect_uri');
      table.integer('expires_at');
      table.integer('revoked_at').nullable();
      table.integer('created_at').nullable();
    });

    await schema.create('oauth_access_tokens', (table) => {
      table.id();
      table.string('client_id');
      table.integer('user_id').nullable();
      table.text('scopes');
      table.string('token', 64);
      table.integer('expires_at');
      table.integer('revoked_at').nullable();
      table.integer('created_at').nullable();
    });

    await schema.create('oauth_refresh_tokens', (table) => {
      table.id();
      table.integer('access_token_id');
      table.string('token', 64);
      table.integer('expires_at');
      table.integer('revoked_at').nullable();
      table.integer('created_at').nullable();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('oauth_refresh_tokens');
    await schema.drop('oauth_access_tokens');
    await schema.drop('oauth_auth_codes');
    await schema.drop('oauth_clients');
  }
}
`;
}

export function oauthServerConfig(): string {
  return `import type { OAuthServerConfig } from '@tyravel/auth-oauth';
import { env } from '@tyravel/config';

export default {
  connection: 'sqlite',
  authorizationCodeTtlMinutes: 10,
  accessTokenTtlMinutes: 60,
  refreshTokenTtlDays: 30,
  tokenPrefix: 'oat_',
} satisfies OAuthServerConfig;
`;
}

export function oauthServerController(): string {
  return `import type { Application } from '@tyravel/core';
import { Auth } from '@tyravel/core';
import { createPkcePair } from '@tyravel/auth';
import { OAuthServer } from '@tyravel/auth-oauth';
import type { TyravelRequest } from '@tyravel/http';
import { Response } from '@tyravel/http';

export class OAuthServerController {
  constructor(private readonly app: Application) {}

  async showAuthorize(request: TyravelRequest) {
    const oauth = this.app.make(OAuthServer);
    const validation = await oauth.validateAuthorizationRequest({
      clientId: request.query('client_id', '') ?? '',
      redirectUri: request.query('redirect_uri', '') ?? '',
      responseType: request.query('response_type', 'code') ?? 'code',
      scope: request.query('scope') ?? undefined,
      state: request.query('state') ?? undefined,
      codeChallenge: request.query('code_challenge') ?? undefined,
      codeChallengeMethod: (request.query('code_challenge_method') as 'S256' | undefined) ?? undefined,
    });

    return Response.json({
      client: { name: validation.client.name },
      scopes: validation.scopes,
      state: request.query('state') ?? null,
      redirect_uri: request.query('redirect_uri', '') ?? '',
      requires_pkce: validation.requiresPkce,
    });
  }

  async approveAuthorize(request: TyravelRequest) {
    const body = await request.json<{
      client_id?: string;
      redirect_uri?: string;
      scope?: string;
      state?: string;
      code_challenge?: string;
      code_challenge_method?: 'S256';
      approve?: boolean;
    }>();

    if (!body.approve) {
      return Response.json({ message: 'Authorization denied.' }, { status: 403 });
    }

    const user = Auth.user();
    if (!user) {
      return Response.json({ message: 'Authentication required.' }, { status: 401 });
    }

    const oauth = this.app.make(OAuthServer);
    const scopes = (body.scope ?? '*').split(/\\s+/).filter(Boolean);
    const issued = await oauth.approveAuthorization({
      userId: Number(user.getAuthIdentifier()),
      clientId: body.client_id ?? '',
      redirectUri: body.redirect_uri ?? '',
      scopes,
      codeChallenge: body.code_challenge,
      codeChallengeMethod: body.code_challenge_method,
    });

    const redirect = oauth.buildAuthorizationRedirect(
      issued.redirectUri,
      issued.code,
      body.state,
    );

    return Response.redirect(redirect, 302);
  }

  async token(request: TyravelRequest) {
    const raw = await this.readTokenRequest(request);
    const oauth = this.app.make(OAuthServer);
    const tokenResponse = await oauth.issueToken({
      grantType: (raw.grant_type ?? 'authorization_code') as 'authorization_code' | 'client_credentials' | 'refresh_token',
      clientId: raw.client_id ?? '',
      clientSecret: raw.client_secret,
      code: raw.code,
      redirectUri: raw.redirect_uri,
      codeVerifier: raw.code_verifier,
      refreshToken: raw.refresh_token,
      scope: raw.scope,
    });
    return Response.json(tokenResponse);
  }

  async revoke(request: TyravelRequest) {
    const raw = await this.readTokenRequest(request);
    if (!raw.token) {
      return Response.json({ error: 'invalid_request', message: 'token is required.' }, { status: 400 });
    }

    const oauth = this.app.make(OAuthServer);
    await oauth.revokeToken(raw.token);
    return new Response(null, { status: 200 });
  }

  async userInfo(request: TyravelRequest) {
    return Response.json({ user: request.user ?? null, scopes: request.tokenAbilities ?? [] });
  }

  private async readTokenRequest(request: TyravelRequest): Promise<Record<string, string>> {
    const contentType = request.header('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await request.json<Record<string, string>>();
      return Object.fromEntries(
        Object.entries(json).map(([key, value]) => [key, String(value)]),
      );
    }

    const form = await request.formData();
    const entries: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      entries[key] = String(value);
    }
    return entries;
  }
}
`;
}

export function oauthServerRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { OAuthServerController } from '../controllers/OAuthServerController.js';

Route.middleware('auth').get('/oauth/authorize', [OAuthServerController, 'showAuthorize']);
Route.middleware(['csrf', 'auth']).post('/oauth/authorize', [OAuthServerController, 'approveAuthorize']);
Route.post('/oauth/token', [OAuthServerController, 'token']);
Route.post('/oauth/revoke', [OAuthServerController, 'revoke']);
Route.middleware('auth:oauth').get('/oauth/userinfo', [OAuthServerController, 'userInfo']);
`;
}

export function appServiceProviderWithAuth(): string {
  return `import { ServiceProvider } from '@tyravel/core';
import { AuthController } from '../controllers/AuthController.js';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('app.name', 'Tyravel');
    this.app.bind(AuthController, () => new AuthController(this.app));
  }
}
`;
}

export function mainEntryWithAuth(): string {
  return `import {
  Application,
  AuthServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  HttpKernel,
  QueueServiceProvider,
  setAuthApplication,
  setEventApplication,
  setGateApplication,
  setPasswordApplication,
  setQueueApplication,
  setRouteApplication,
  setViewApplication,
  ViewServiceProvider,
  serve,
} from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/web.js';
import './routes/auth.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setViewApplication(app);
setQueueApplication(app);
setEventApplication(app);
setAuthApplication(app);
setGateApplication(app);
setPasswordApplication(app);

app.register(ConfigServiceProvider);
app.register(DatabaseServiceProvider);
app.register(QueueServiceProvider);
app.register(EventServiceProvider);
app.register(AuthServiceProvider);
app.register(ViewServiceProvider);
app.register(AppServiceProvider);

await app.boot();

const kernel = new HttpKernel(app);
await serve(kernel);
`;
}

export function adminConfig(): string {
  return `import { User } from '../src/models/User.js';

export default {
  enabled: true,
  prefix: '/admin',
  middleware: ['admin'],
  accessAbility: 'accessAdmin',
  accessPolicyModel: User,
  perPage: 15,
  auditLog: {
    enabled: true,
    persistPath: '.tyravel/admin-audit.json',
    maxEntries: 500,
  },
} as const;
`;
}

export function adminRoutes(): string {
  return `import { Route } from '@tyravel/core';
import { AdminController, registerAdminRoutes } from '@tyravel/admin';

registerAdminRoutes(Route, AdminController);
`;
}

export function adminResources(): string {
  return `import { defineAdminResource, type AdminRegistry } from '@tyravel/admin';
import { User } from '../models/User.js';
import { UserPolicy } from '../policies/UserPolicy.js';

export function registerAdminResources(registry: AdminRegistry): void {
  registry.register(
    defineAdminResource('users', User, {
      label: 'Users',
      policy: UserPolicy,
      fields: [
        { name: 'id', label: 'ID', sortable: true },
        { name: 'name', label: 'Name', searchable: true, sortable: true },
        { name: 'email', label: 'Email', type: 'email', searchable: true, sortable: true },
      ],
    }),
  );
}
`;
}

export function adminPanelServiceProvider(): string {
  return `import { ServiceProvider } from '@tyravel/core';
import { AdminServiceProvider } from '@tyravel/admin';

export class AdminPanelServiceProvider extends ServiceProvider {
  private readonly admin = new AdminServiceProvider(this.app);

  override register(): void {
    this.admin.register();
  }

  override boot(): void {
    this.admin.boot();
  }
}
`;
}

export function userPolicyWithAdmin(): string {
  return `import { Policy } from '@tyravel/auth';
import type { Authenticatable } from '@tyravel/auth';

export class UserPolicy extends Policy {
  accessAdmin(user: Authenticatable): boolean {
    return user.getAuthIdentifier() !== undefined;
  }

  viewAny(user: Authenticatable): boolean {
    return this.accessAdmin(user);
  }

  view(user: Authenticatable, _model: unknown): boolean {
    return this.accessAdmin(user);
  }

  create(user: Authenticatable): boolean {
    return this.accessAdmin(user);
  }

  update(user: Authenticatable, _model: unknown): boolean {
    return this.accessAdmin(user);
  }

  delete(user: Authenticatable, _model: unknown): boolean {
    return this.accessAdmin(user);
  }
}
`;
}

export function debugConfig(): string {
  return `export default {
  enabled: true,
  path: '/__debug',
  injectBar: true,
  maxEntries: 50,
  persist: true,
  persistPath: '.tyravel/debug-entries.json',
  slowQueryMs: 100,
  nPlusOneThreshold: 3,
  otel: {
    enabled: false,
    endpoint: 'http://127.0.0.1:4318/v1/traces',
    serviceName: 'tyravel',
  },
} as const;
`;
}

export function debugPanelServiceProvider(): string {
  return `import { ServiceProvider } from '@tyravel/core';
import { DebugServiceProvider } from '@tyravel/debug';

export class DebugPanelServiceProvider extends ServiceProvider {
  private readonly debug = new DebugServiceProvider(this.app);

  override async register(): Promise<void> {
    await this.debug.register();
  }

  override boot(): void {
    this.debug.boot();
  }
}
`;
}

export function cryptoConfig(): string {
  return `import type { CryptoConfig } from '@tyravel/crypto';
import { env } from '@tyravel/config';

export default {
  kem: 'hybrid-x25519-ml-kem-768',
  signature: 'ml-dsa-65',
  session: {
    encrypt: env('SESSION_ENCRYPT', 'false') === 'true',
    key: env('SESSION_ENCRYPTION_KEY', ''),
    fallbackKey: env('APP_KEY', ''),
  },
  oauth: {
    signTokens: env('OAUTH_SIGN_TOKENS', 'false') === 'true',
    algorithm: 'ml-dsa-65',
    publicKey: env('OAUTH_TOKEN_PUBLIC_KEY', ''),
    secretKey: env('OAUTH_TOKEN_SECRET_KEY', ''),
  },
} satisfies CryptoConfig;
`;
}