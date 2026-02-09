import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subscription_plans', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('name', 50)
      .notNullable();

    table
      .string('apple_product_id', 100)
      .unique()
      .nullable();

    table
      .string('google_product_id', 100)
      .unique()
      .nullable();

    table
      .decimal('price_usd', 10, 2)
      .notNullable();

    table
      .integer('duration_months')
      .notNullable();

    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true);

    table
      .jsonb('features')
      .notNullable()
      .defaultTo('{}');

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('is_active', 'idx_subscription_plans_is_active');
  });

  await knex.schema.createTable('user_subscriptions', (table) => {
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
      .uuid('plan_id')
      .nullable()
      .references('id')
      .inTable('subscription_plans')
      .onDelete('SET NULL');

    table
      .enu('platform', ['apple', 'google'], {
        useNative: true,
        enumName: 'subscription_platform',
      })
      .notNullable();

    table
      .string('platform_subscription_id', 255)
      .notNullable();

    table
      .text('receipt_data')
      .nullable();

    table
      .enu('status', ['active', 'cancelled', 'expired', 'grace_period', 'billing_retry'], {
        useNative: true,
        enumName: 'subscription_status',
      })
      .notNullable()
      .defaultTo('active');

    table
      .timestamp('starts_at')
      .notNullable();

    table
      .timestamp('expires_at')
      .notNullable();

    table
      .timestamp('cancelled_at')
      .nullable();

    table
      .boolean('is_auto_renewing')
      .notNullable()
      .defaultTo(true);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_user_subscriptions_user_id');
    table.index('status', 'idx_user_subscriptions_status');
    table.index('expires_at', 'idx_user_subscriptions_expires_at');
    table.index(
      ['user_id', 'status', 'expires_at'],
      'idx_user_subscriptions_user_status_expires',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_subscriptions');
  await knex.schema.dropTableIfExists('subscription_plans');
  await knex.raw('DROP TYPE IF EXISTS "subscription_platform"');
  await knex.raw('DROP TYPE IF EXISTS "subscription_status"');
}
