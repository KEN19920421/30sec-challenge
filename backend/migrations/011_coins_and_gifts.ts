import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('coin_packages', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('name', 50)
      .notNullable();

    table
      .integer('coin_amount')
      .notNullable();

    table
      .integer('bonus_amount')
      .notNullable()
      .defaultTo(0);

    table
      .decimal('price_usd', 10, 2)
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
      .boolean('is_best_value')
      .notNullable()
      .defaultTo(false);

    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true);

    table
      .integer('sort_order')
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

    // Indexes
    table.index('is_active', 'idx_coin_packages_is_active');
    table.index('sort_order', 'idx_coin_packages_sort_order');
  });

  await knex.schema.createTable('coin_transactions', (table) => {
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
      .enu(
        'type',
        ['purchase', 'gift_sent', 'gift_received', 'reward', 'achievement', 'refund', 'admin_adjustment'],
        {
          useNative: true,
          enumName: 'coin_transaction_type',
        },
      )
      .notNullable();

    table
      .integer('amount')
      .notNullable();

    table
      .integer('balance_after')
      .notNullable();

    table
      .string('reference_type', 50)
      .nullable();

    table
      .uuid('reference_id')
      .nullable();

    table
      .string('description', 255)
      .nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_coin_transactions_user_id');
    table.index('type', 'idx_coin_transactions_type');
    table.index('created_at', 'idx_coin_transactions_created_at');
    table.index(
      ['user_id', 'type', 'created_at'],
      'idx_coin_transactions_user_type_created',
    );
  });

  await knex.schema.createTable('gift_catalog', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('name', 50)
      .notNullable();

    table
      .string('name_ja', 50)
      .nullable();

    table
      .text('icon_url')
      .notNullable();

    table
      .text('animation_url')
      .nullable();

    table
      .enu('category', ['quick_reaction', 'standard', 'premium'], {
        useNative: true,
        enumName: 'gift_category',
      })
      .notNullable();

    table
      .integer('coin_cost')
      .notNullable();

    table
      .integer('creator_coin_share')
      .notNullable();

    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true);

    table
      .integer('sort_order')
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

    // Indexes
    table.index('category', 'idx_gift_catalog_category');
    table.index('is_active', 'idx_gift_catalog_is_active');
    table.index('sort_order', 'idx_gift_catalog_sort_order');
  });

  await knex.schema.createTable('gift_transactions', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('sender_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .uuid('receiver_id')
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
      .uuid('gift_id')
      .nullable()
      .references('id')
      .inTable('gift_catalog')
      .onDelete('SET NULL');

    table
      .integer('coin_amount')
      .notNullable();

    table
      .integer('creator_share')
      .notNullable();

    table
      .integer('platform_share')
      .notNullable();

    table
      .string('message', 100)
      .nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('sender_id', 'idx_gift_transactions_sender_id');
    table.index('receiver_id', 'idx_gift_transactions_receiver_id');
    table.index('submission_id', 'idx_gift_transactions_submission_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gift_transactions');
  await knex.schema.dropTableIfExists('gift_catalog');
  await knex.schema.dropTableIfExists('coin_transactions');
  await knex.schema.dropTableIfExists('coin_packages');
  await knex.raw('DROP TYPE IF EXISTS "coin_transaction_type"');
  await knex.raw('DROP TYPE IF EXISTS "gift_category"');
}
