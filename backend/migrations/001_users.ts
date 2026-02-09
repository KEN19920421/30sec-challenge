import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('users', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('username', 30)
      .unique()
      .notNullable();

    table
      .string('email', 255)
      .unique()
      .notNullable();

    table
      .string('password_hash', 255)
      .nullable();

    table
      .string('display_name', 50)
      .notNullable();

    table
      .text('avatar_url')
      .nullable();

    table
      .string('bio', 200)
      .nullable();

    table
      .enu('role', ['user', 'moderator', 'admin'], {
        useNative: true,
        enumName: 'user_role',
      })
      .notNullable()
      .defaultTo('user');

    table
      .enu('subscription_tier', ['free', 'pro'], {
        useNative: true,
        enumName: 'subscription_tier',
      })
      .notNullable()
      .defaultTo('free');

    table
      .timestamp('subscription_expires_at')
      .nullable();

    table
      .integer('coin_balance')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_coins_earned')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_coins_spent')
      .notNullable()
      .defaultTo(0);

    table
      .integer('follower_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('following_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('submission_count')
      .notNullable()
      .defaultTo(0);

    table
      .integer('total_votes_received')
      .notNullable()
      .defaultTo(0);

    table
      .boolean('is_verified')
      .notNullable()
      .defaultTo(false);

    table
      .boolean('is_banned')
      .notNullable()
      .defaultTo(false);

    table
      .text('ban_reason')
      .nullable();

    table
      .timestamp('last_active_at')
      .nullable();

    table
      .string('locale', 10)
      .notNullable()
      .defaultTo('en');

    table
      .string('timezone', 50)
      .nullable();

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

    // Indexes for commonly queried columns
    table.index('role', 'idx_users_role');
    table.index('subscription_tier', 'idx_users_subscription_tier');
    table.index('is_banned', 'idx_users_is_banned');
    table.index('created_at', 'idx_users_created_at');
    table.index('deleted_at', 'idx_users_deleted_at');
    table.index('last_active_at', 'idx_users_last_active_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS "user_role"');
  await knex.raw('DROP TYPE IF EXISTS "subscription_tier"');
}
