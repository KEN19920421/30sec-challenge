import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_auth_providers', (table) => {
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
      .enu('provider', ['google', 'apple'], {
        useNative: true,
        enumName: 'auth_provider',
      })
      .notNullable();

    table
      .string('provider_user_id', 255)
      .notNullable();

    table
      .string('provider_email', 255)
      .nullable();

    table
      .text('access_token')
      .nullable();

    table
      .text('refresh_token')
      .nullable();

    table
      .timestamp('token_expires_at')
      .nullable();

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // One account per provider per external user
    table.unique(['provider', 'provider_user_id'], {
      indexName: 'uq_auth_provider_user',
    });

    // Index on foreign key for join performance
    table.index('user_id', 'idx_auth_providers_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_auth_providers');
  await knex.raw('DROP TYPE IF EXISTS "auth_provider"');
}
