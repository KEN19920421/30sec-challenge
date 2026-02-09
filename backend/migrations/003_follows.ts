import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('follows', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('follower_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .uuid('following_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // A user can only follow another user once
    table.unique(['follower_id', 'following_id'], {
      indexName: 'uq_follows_pair',
    });

    // Indexes on foreign keys for fan/following list queries
    table.index('follower_id', 'idx_follows_follower_id');
    table.index('following_id', 'idx_follows_following_id');
  });

  // Prevent self-follows at the database level
  await knex.raw(`
    ALTER TABLE "follows"
    ADD CONSTRAINT chk_no_self_follow
    CHECK ("follower_id" != "following_id")
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('follows');
}
