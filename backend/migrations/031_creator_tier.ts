import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE creator_tier AS ENUM ('rookie', 'rising', 'partner', 'featured')
  `);

  await knex.schema.alterTable('users', (table) => {
    table.specificType('creator_tier', 'creator_tier').nullable().defaultTo(null);
  });

  await knex.schema.alterTable('submissions', (table) => {
    table.uuid('duet_parent_id').nullable().references('id').inTable('submissions').onDelete('SET NULL');
    table.index(['duet_parent_id'], 'idx_submissions_duet_parent_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('submissions', (table) => {
    table.dropIndex([], 'idx_submissions_duet_parent_id');
    table.dropColumn('duet_parent_id');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('creator_tier');
  });

  await knex.raw(`DROP TYPE IF EXISTS creator_tier`);
}
