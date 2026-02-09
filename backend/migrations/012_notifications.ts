import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
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
      .string('type', 50)
      .notNullable();

    table
      .string('title', 200)
      .notNullable();

    table
      .text('body')
      .nullable();

    table
      .jsonb('data')
      .notNullable()
      .defaultTo('{}');

    table
      .text('image_url')
      .nullable();

    table
      .boolean('is_read')
      .notNullable()
      .defaultTo(false);

    table
      .timestamp('read_at')
      .nullable();

    table
      .boolean('is_push_sent')
      .notNullable()
      .defaultTo(false);

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_notifications_user_id');
    table.index('type', 'idx_notifications_type');
    table.index(
      ['user_id', 'is_read', 'created_at'],
      'idx_notifications_user_read_created',
    );
  });

  await knex.schema.createTable('push_tokens', (table) => {
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
      .text('token')
      .notNullable();

    table
      .enu('platform', ['ios', 'android'], {
        useNative: true,
        enumName: 'push_token_platform',
      })
      .notNullable();

    table
      .boolean('is_active')
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

    // One token per user-token pair
    table.unique(['user_id', 'token'], {
      indexName: 'uq_push_tokens_user_token',
    });

    // Indexes
    table.index('user_id', 'idx_push_tokens_user_id');
    table.index('is_active', 'idx_push_tokens_is_active');
  });

  await knex.schema.createTable('notification_preferences', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .boolean('new_follower')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('vote_received')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('gift_received')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('challenge_start')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('rank_achieved')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('achievement_earned')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('submission_status')
      .notNullable()
      .defaultTo(true);

    table
      .boolean('marketing')
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
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('push_tokens');
  await knex.schema.dropTableIfExists('notifications');
  await knex.raw('DROP TYPE IF EXISTS "push_token_platform"');
}
