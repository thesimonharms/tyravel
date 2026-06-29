import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

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
