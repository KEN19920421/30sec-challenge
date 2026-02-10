import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add 'boost_spent' to the existing coin_transaction_type enum
  await knex.raw(`ALTER TYPE "coin_transaction_type" ADD VALUE IF NOT EXISTS 'boost_spent'`);

  // Add boost_score column to submissions
  await knex.schema.alterTable('submissions', (table) => {
    table
      .decimal('boost_score', 5, 2)
      .notNullable()
      .defaultTo(0);
  });

  // Create submission_boosts table
  await knex.schema.createTable('submission_boosts', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('submission_id')
      .notNullable()
      .references('id')
      .inTable('submissions')
      .onDelete('CASCADE');

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .string('tier', 20)
      .notNullable();

    table
      .integer('coin_amount')
      .notNullable();

    table
      .decimal('boost_value', 5, 2)
      .notNullable();

    table
      .timestamp('started_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('expires_at')
      .notNullable();

    // Indexes
    table.index('submission_id', 'idx_submission_boosts_submission_id');
    table.index('user_id', 'idx_submission_boosts_user_id');
    table.index('expires_at', 'idx_submission_boosts_expires_at');
    table.index(
      ['submission_id', 'expires_at'],
      'idx_submission_boosts_sub_expires',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('submission_boosts');

  await knex.schema.alterTable('submissions', (table) => {
    table.dropColumn('boost_score');
  });

  // Note: PostgreSQL does not support removing enum values; the 'boost_spent'
  // value will remain in the enum but is harmless.
}
