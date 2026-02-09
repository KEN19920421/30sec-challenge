import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('daily_stats', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .date('stat_date')
      .notNullable()
      .unique();

    table
      .integer('new_users')
      .notNullable()
      .defaultTo(0);

    table
      .integer('active_users')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_submissions')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_votes')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_gifts_sent')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_coins_purchased')
      .notNullable()
      .defaultTo(0);

    table
      .decimal('total_revenue_usd', 10, 2)
      .notNullable()
      .defaultTo(0);

    table
      .integer('new_subscriptions')
      .notNullable()
      .defaultTo(0);

    table
      .integer('churned_subscriptions')
      .notNullable()
      .defaultTo(0);

    table
      .integer('ad_impressions')
      .notNullable()
      .defaultTo(0);

    table
      .decimal('ad_revenue_usd', 10, 2)
      .notNullable()
      .defaultTo(0);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_activity_log', (table) => {
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
      .string('activity_type', 50)
      .notNullable();

    table
      .jsonb('metadata')
      .notNullable()
      .defaultTo('{}');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_user_activity_log_user_id');
    table.index('activity_type', 'idx_user_activity_log_activity_type');
    table.index('created_at', 'idx_user_activity_log_created_at');
    table.index(
      ['user_id', 'activity_type', 'created_at'],
      'idx_user_activity_log_user_type_created',
    );
  });

  // Partition hint: consider partitioning user_activity_log by month for large scale
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_activity_log');
  await knex.schema.dropTableIfExists('daily_stats');
}
