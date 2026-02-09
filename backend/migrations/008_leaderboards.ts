import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leaderboard_snapshots', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('challenge_id')
      .notNullable()
      .references('id')
      .inTable('challenges')
      .onDelete('CASCADE');

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
      .enu('period', ['daily', 'weekly', 'all_time'], {
        useNative: true,
        enumName: 'leaderboard_period',
      })
      .notNullable();

    table
      .integer('rank')
      .notNullable();

    table
      .decimal('score', 10, 8)
      .notNullable();

    table
      .integer('vote_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('super_vote_count')
      .notNullable()
      .defaultTo(0);

    table
      .date('snapshot_date')
      .notNullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Composite index for fetching a leaderboard page for a specific challenge/period/date
    table.index(
      ['challenge_id', 'period', 'snapshot_date', 'rank'],
      'idx_leaderboard_challenge_period_date_rank',
    );

    // Composite index for fetching a user's history across periods
    table.index(
      ['user_id', 'period'],
      'idx_leaderboard_user_period',
    );

    // Indexes on foreign keys
    table.index('submission_id', 'idx_leaderboard_submission_id');
    table.index('challenge_id', 'idx_leaderboard_challenge_id');
    table.index('user_id', 'idx_leaderboard_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leaderboard_snapshots');
  await knex.raw('DROP TYPE IF EXISTS "leaderboard_period"');
}
