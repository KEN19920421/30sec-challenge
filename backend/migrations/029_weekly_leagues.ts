import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the league tier enum
  await knex.raw(`
    CREATE TYPE league_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'master')
  `);

  await knex.schema.createTable('user_league_memberships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('tier', 'league_tier').notNullable().defaultTo('bronze');
    table.date('season_week').notNullable(); // Monday of the week
    table.integer('points').notNullable().defaultTo(0);
    table.integer('rank').nullable();
    table.boolean('promoted').notNullable().defaultTo(false);
    table.boolean('relegated').notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.unique(['user_id', 'season_week']);
    table.index(['season_week', 'tier', 'points'], 'idx_league_week_tier_points');
    table.index(['user_id'], 'idx_league_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_league_memberships');
  await knex.raw(`DROP TYPE IF EXISTS league_tier`);
}
