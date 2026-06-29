import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

export default class CreateNotificationsTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('notifications', (table) => {
      table.string('id', 36).unique();
      table.string('type');
      table.string('notifiable_type');
      table.string('notifiable_id');
      table.text('data');
      table.integer('read_at').nullable();
      table.integer('created_at').nullable();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('notifications');
  }
}