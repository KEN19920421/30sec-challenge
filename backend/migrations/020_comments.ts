import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
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
      .text('content')
      .notNullable();

    table
      .uuid('parent_id')
      .nullable()
      .references('id')
      .inTable('comments')
      .onDelete('CASCADE');

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

    // Indexes
    table.index('user_id', 'idx_comments_user_id');
    table.index('submission_id', 'idx_comments_submission_id');
    table.index('parent_id', 'idx_comments_parent_id');
    table.index(
      ['submission_id', 'created_at'],
      'idx_comments_submission_created',
    );
  });

  // Content length constraint: 1-500 characters
  await knex.raw(`
    ALTER TABLE "comments"
    ADD CONSTRAINT chk_comment_content_length
    CHECK (LENGTH("content") BETWEEN 1 AND 500)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comments');
}
