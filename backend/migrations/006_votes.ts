import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('votes', (table) => {
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
      .uuid('submission_id')
      .notNullable()
      .references('id')
      .inTable('submissions')
      .onDelete('CASCADE');

    table
      .uuid('challenge_id')
      .notNullable()
      .references('id')
      .inTable('challenges')
      .onDelete('CASCADE');

    table
      .integer('value')
      .notNullable();

    table
      .boolean('is_super_vote')
      .notNullable()
      .defaultTo(false);

    table
      .enu('source', ['organic', 'rewarded_ad'], {
        useNative: true,
        enumName: 'vote_source',
      })
      .notNullable()
      .defaultTo('organic');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // One vote per user per submission
    table.unique(['user_id', 'submission_id'], {
      indexName: 'uq_votes_user_submission',
    });

    // Indexes on foreign keys for aggregation queries
    table.index('user_id', 'idx_votes_user_id');
    table.index('submission_id', 'idx_votes_submission_id');
    table.index('challenge_id', 'idx_votes_challenge_id');
  });

  // Only allow upvote (1) or downvote (-1)
  await knex.raw(`
    ALTER TABLE "votes"
    ADD CONSTRAINT chk_vote_value
    CHECK ("value" IN (1, -1))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('votes');
  await knex.raw('DROP TYPE IF EXISTS "vote_source"');
}
