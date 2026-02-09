import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('vote_queue', (table) => {
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
      .uuid('submission_id')
      .notNullable()
      .references('id')
      .inTable('submissions')
      .onDelete('CASCADE');

    table
      .integer('position')
      .notNullable();

    table
      .boolean('is_voted')
      .notNullable()
      .defaultTo(false);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Each submission appears once per user per challenge queue
    table.unique(['user_id', 'challenge_id', 'submission_id'], {
      indexName: 'uq_vote_queue_user_challenge_submission',
    });

    // Composite index for fetching the next unvoted item in a user's queue
    table.index(
      ['user_id', 'challenge_id', 'is_voted', 'position'],
      'idx_vote_queue_next_item',
    );

    // Indexes on foreign keys
    table.index('challenge_id', 'idx_vote_queue_challenge_id');
    table.index('submission_id', 'idx_vote_queue_submission_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vote_queue');
}
