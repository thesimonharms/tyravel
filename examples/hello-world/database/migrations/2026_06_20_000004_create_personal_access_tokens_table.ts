import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

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