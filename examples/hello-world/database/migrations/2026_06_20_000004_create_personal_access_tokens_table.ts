import { Migration } from '@tyravel/database';
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