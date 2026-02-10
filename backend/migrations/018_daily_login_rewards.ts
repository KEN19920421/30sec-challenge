import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_login_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('reward_date').notNullable();
    table.integer('coin_amount').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'reward_date']);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_login_rewards');
}
