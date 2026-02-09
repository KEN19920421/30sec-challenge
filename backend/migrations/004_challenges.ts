import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('challenges', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('title', 100)
      .notNullable();

    table
      .string('title_ja', 100)
      .nullable();

    table
      .text('description')
      .notNullable();

    table
      .text('description_ja')
      .nullable();

    table
      .string('category', 50)
      .notNullable();

    table
      .enu('difficulty', ['easy', 'medium', 'hard'], {
        useNative: true,
        enumName: 'challenge_difficulty',
      })
      .notNullable()
      .defaultTo('medium');

    table
      .text('thumbnail_url')
      .nullable();

    table
      .string('sponsor_name', 100)
      .nullable();

    table
      .text('sponsor_logo_url')
      .nullable();

    table
      .text('sponsor_url')
      .nullable();

    table
      .enu('status', ['draft', 'scheduled', 'active', 'voting', 'completed', 'cancelled'], {
        useNative: true,
        enumName: 'challenge_status',
      })
      .notNullable()
      .defaultTo('draft');

    table
      .timestamp('starts_at')
      .notNullable();

    table
      .timestamp('ends_at')
      .notNullable();

    table
      .timestamp('voting_ends_at')
      .notNullable();

    table
      .integer('max_submissions')
      .nullable();

    table
      .integer('submission_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_votes')
      .notNullable()
      .defaultTo(0);

    table
      .boolean('is_premium_early_access')
      .notNullable()
      .defaultTo(false);

    table
      .integer('early_access_hours')
      .notNullable()
      .defaultTo(2);

    table
      .uuid('created_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes for listing and scheduling queries
    table.index('status', 'idx_challenges_status');
    table.index('starts_at', 'idx_challenges_starts_at');
    table.index('ends_at', 'idx_challenges_ends_at');
    table.index('voting_ends_at', 'idx_challenges_voting_ends_at');
    table.index('category', 'idx_challenges_category');
    table.index('created_by', 'idx_challenges_created_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('challenges');
  await knex.raw('DROP TYPE IF EXISTS "challenge_difficulty"');
  await knex.raw('DROP TYPE IF EXISTS "challenge_status"');
}
