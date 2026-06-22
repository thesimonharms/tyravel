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
});

export default {
  name: env('APP_NAME', '${name}'),
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
} as const;
`;
}

export function viewsConfig(): string {
  return `export default {
  path: 'resources/views',
  extension: '.tyr',
  compiledPath: 'storage/framework/views',
} as const;
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

export function model(name: string): string {
  const table = `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;

  return `import { Model } from '@tyravel/database';

export interface ${name}Attributes {
  id: number;
}

export class ${name} extends Model<${name}Attributes> {
  static override table = '${table}';
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
  <title>@yield('title', 'Tyravel')</title>
</head>
<body>
  @yield('content')
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
      table.text('abilities').nullable();
      table.integer('last_used_at').nullable();
      table.integer('expires_at').nullable();
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
    const token = await Password.sendResetLink(body.email ?? '');
    return Response.json({
      message: 'Password reset link generated.',
      token,
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
    const body = await request.json<{ name?: string; abilities?: string[] }>();
    const token = await Auth.createToken(body.name ?? 'api', body.abilities);
    return Response.json({
      name: token.name,
      plainTextToken: token.plainTextToken,
      abilities: token.abilities,
    });
  }

  oauthRedirect(request: TyravelRequest) {
    const provider = request.param('provider');
    const oauth = this.app.make(OAuthManager);
    const state = oauth.createState();
    request.session?.put(\`oauth.\${provider}.state\`, state);
    const url = oauth.redirectUrl(provider, state);
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

    const profile = await oauth.handleCallback(provider, code, state);
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

Route.middleware('guest').post('/login', [AuthController, 'login']);
Route.middleware('auth').post('/logout', [AuthController, 'logout']);
Route.middleware('auth').get('/me', [AuthController, 'me']);
Route.middleware('guest').post('/forgot-password', [AuthController, 'forgotPassword']);
Route.middleware('guest').post('/reset-password', [AuthController, 'resetPassword']);
Route.middleware('auth').post('/tokens', [AuthController, 'createToken']);
Route.middleware('guest').get('/auth/:provider/redirect', [AuthController, 'oauthRedirect']);
Route.middleware('guest').get('/auth/:provider/callback', [AuthController, 'oauthCallback']);
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