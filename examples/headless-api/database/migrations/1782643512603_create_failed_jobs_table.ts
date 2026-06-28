import { Migration } from '@tyravel/database';
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
