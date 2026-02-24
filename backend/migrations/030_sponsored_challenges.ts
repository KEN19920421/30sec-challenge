import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('challenges', (table) => {
    table.boolean('is_sponsored').notNullable().defaultTo(false);
    table.integer('prize_amount').notNullable().defaultTo(0); // in coins
    table.text('prize_description').nullable();
    table.boolean('is_premium_only').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('challenges', (table) => {
    table.dropColumn('is_sponsored');
    table.dropColumn('prize_amount');
    table.dropColumn('prize_description');
    table.dropColumn('is_premium_only');
  });
}
