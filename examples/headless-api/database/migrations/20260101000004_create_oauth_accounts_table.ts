import { Migration } from '@tyravel/database';
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
