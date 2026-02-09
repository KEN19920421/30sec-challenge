import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('achievements', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .string('key', 50)
      .unique()
      .notNullable();

    table
      .string('name', 100)
      .notNullable();

    table
      .string('name_ja', 100)
      .nullable();

    table
      .text('description')
      .notNullable();

    table
      .text('description_ja')
      .nullable();

    table
      .text('icon_url')
      .nullable();

    table
      .string('category', 50)
      .notNullable();

    table
      .enu('tier', ['bronze', 'silver', 'gold', 'platinum'], {
        useNative: true,
        enumName: 'achievement_tier',
      })
      .notNullable()
      .defaultTo('bronze');

    table
      .string('requirement_type', 50)
      .notNullable();

    table
      .integer('requirement_value')
      .notNullable();

    table
      .integer('coin_reward')
      .notNullable()
      .defaultTo(0);

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

    // Indexes
    table.index('category', 'idx_achievements_category');
    table.index('tier', 'idx_achievements_tier');
    table.index('is_active', 'idx_achievements_is_active');
  });

  await knex.schema.createTable('user_achievements', (table) => {
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
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('achievements')
      .onDelete('CASCADE');

    table
      .timestamp('earned_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .boolean('is_notified')
      .notNullable()
      .defaultTo(false);

    // One achievement per user
    table.unique(['user_id', 'achievement_id'], {
      indexName: 'uq_user_achievements_user_achievement',
    });

    // Indexes
    table.index('user_id', 'idx_user_achievements_user_id');
    table.index('achievement_id', 'idx_user_achievements_achievement_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievements');
  await knex.raw('DROP TYPE IF EXISTS "achievement_tier"');
}
