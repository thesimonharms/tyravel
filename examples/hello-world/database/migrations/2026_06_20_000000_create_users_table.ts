import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

export default class CreateUsersTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('users', (table) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.string('password');
      table.timestamps();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('users');
  }
}