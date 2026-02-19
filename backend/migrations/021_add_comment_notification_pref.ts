import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notification_preferences', (table) => {
    table.boolean('comment_received').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notification_preferences', (table) => {
    table.dropColumn('comment_received');
  });
}
