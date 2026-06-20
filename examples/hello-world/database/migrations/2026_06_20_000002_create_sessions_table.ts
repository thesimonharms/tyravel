import { Migration } from '@tyravel/database';
import type { DatabaseConnection } from '@tyravel/database';
import type { SchemaBuilder } from '@tyravel/database';

export default class CreateSessionsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('sessions', (table) => {
      table.string('id', 128).unique();
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