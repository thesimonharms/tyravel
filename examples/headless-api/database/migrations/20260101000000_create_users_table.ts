import { Migration } from '@tyravel/database';
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
