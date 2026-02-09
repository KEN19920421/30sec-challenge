import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ad_events', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .enu('ad_type', ['interstitial', 'rewarded', 'banner', 'native'], {
        useNative: true,
        enumName: 'ad_type',
      })
      .notNullable();

    table
      .string('placement', 50)
      .notNullable();

    table
      .string('ad_network', 50)
      .notNullable()
      .defaultTo('admob');

    table
      .string('ad_unit_id', 100)
      .nullable();

    table
      .enu('event_type', ['impression', 'click', 'completed', 'reward_granted', 'failed'], {
        useNative: true,
        enumName: 'ad_event_type',
      })
      .notNullable();

    table
      .string('reward_type', 50)
      .nullable();

    table
      .integer('reward_amount')
      .nullable();

    table
      .decimal('revenue_estimate', 10, 6)
      .nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_ad_events_user_id');
    table.index('ad_type', 'idx_ad_events_ad_type');
    table.index('created_at', 'idx_ad_events_created_at');
    table.index(
      ['user_id', 'ad_type', 'created_at'],
      'idx_ad_events_user_type_created',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ad_events');
  await knex.raw('DROP TYPE IF EXISTS "ad_type"');
  await knex.raw('DROP TYPE IF EXISTS "ad_event_type"');
}
