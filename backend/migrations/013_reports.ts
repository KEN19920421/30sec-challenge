import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reports', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('reporter_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .uuid('reported_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .uuid('submission_id')
      .nullable()
      .references('id')
      .inTable('submissions')
      .onDelete('SET NULL');

    table
      .enu('reason', ['inappropriate', 'spam', 'harassment', 'violence', 'copyright', 'other'], {
        useNative: true,
        enumName: 'report_reason',
      })
      .notNullable();

    table
      .text('description')
      .nullable();

    table
      .enu('status', ['pending', 'reviewing', 'resolved', 'dismissed'], {
        useNative: true,
        enumName: 'report_status',
      })
      .notNullable()
      .defaultTo('pending');

    table
      .uuid('resolved_by')
      .nullable()
      .references('id')
      .inTable('users');

    table
      .text('resolution_note')
      .nullable();

    table
      .timestamp('resolved_at')
      .nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('status', 'idx_reports_status');
    table.index('reporter_id', 'idx_reports_reporter_id');
    table.index('reported_user_id', 'idx_reports_reported_user_id');
    table.index('submission_id', 'idx_reports_submission_id');
  });

  await knex.schema.createTable('blocked_users', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('blocker_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .uuid('blocked_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // One block per user pair
    table.unique(['blocker_id', 'blocked_id'], {
      indexName: 'uq_blocked_users_blocker_blocked',
    });

    // Indexes
    table.index('blocker_id', 'idx_blocked_users_blocker_id');
    table.index('blocked_id', 'idx_blocked_users_blocked_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('blocked_users');
  await knex.schema.dropTableIfExists('reports');
  await knex.raw('DROP TYPE IF EXISTS "report_reason"');
  await knex.raw('DROP TYPE IF EXISTS "report_status"');
}
