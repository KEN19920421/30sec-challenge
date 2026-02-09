import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('submissions', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .uuid('challenge_id')
      .notNullable()
      .references('id')
      .inTable('challenges')
      .onDelete('CASCADE');

    table
      .string('caption', 200)
      .nullable();

    table
      .text('video_key')
      .notNullable();

    table
      .text('video_url')
      .nullable();

    table
      .text('thumbnail_url')
      .nullable();

    table
      .text('hls_url')
      .nullable();

    table
      .decimal('video_duration', 5, 2)
      .nullable();

    table
      .integer('video_width')
      .nullable();

    table
      .integer('video_height')
      .nullable();

    table
      .bigInteger('file_size_bytes')
      .nullable();

    table
      .enu('transcode_status', ['pending', 'processing', 'completed', 'failed'], {
        useNative: true,
        enumName: 'transcode_status',
      })
      .notNullable()
      .defaultTo('pending');

    table
      .string('transcode_job_id', 100)
      .nullable();

    table
      .enu('moderation_status', ['pending', 'approved', 'rejected', 'manual_review'], {
        useNative: true,
        enumName: 'moderation_status',
      })
      .notNullable()
      .defaultTo('pending');

    table
      .text('moderation_reason')
      .nullable();

    table
      .integer('vote_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('super_vote_count')
      .notNullable()
      .defaultTo(0);

    table
      .decimal('wilson_score', 10, 8)
      .notNullable()
      .defaultTo(0);

    table
      .integer('rank')
      .nullable();

    table
      .integer('total_views')
      .notNullable()
      .defaultTo(0);

    table
      .integer('gift_coins_received')
      .notNullable()
      .defaultTo(0);

    table
      .boolean('is_hidden')
      .notNullable()
      .defaultTo(false);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('deleted_at')
      .nullable();

    // One submission per user per challenge
    table.unique(['user_id', 'challenge_id'], {
      indexName: 'uq_submissions_user_challenge',
    });

    // Indexes on foreign keys
    table.index('user_id', 'idx_submissions_user_id');
    table.index('challenge_id', 'idx_submissions_challenge_id');

    // Indexes for processing pipelines
    table.index('transcode_status', 'idx_submissions_transcode_status');
    table.index('moderation_status', 'idx_submissions_moderation_status');

    // Index for leaderboard/ranking queries
    table.index('wilson_score', 'idx_submissions_wilson_score');
    table.index('deleted_at', 'idx_submissions_deleted_at');

    // Composite index for fetching ranked submissions within a challenge
    table.index(
      ['challenge_id', 'moderation_status', 'wilson_score'],
      'idx_submissions_challenge_ranking',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('submissions');
  await knex.raw('DROP TYPE IF EXISTS "transcode_status"');
  await knex.raw('DROP TYPE IF EXISTS "moderation_status"');
}
