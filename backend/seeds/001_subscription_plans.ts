import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  await knex('subscription_plans').del();

  await knex('subscription_plans').insert([
    {
      id: uuidv4(),
      name: 'Pro Monthly',
      apple_product_id: 'pro_monthly',
      google_product_id: 'pro_monthly',
      price_usd: 4.99,
      duration_months: 1,
      is_active: true,
      features: JSON.stringify({
        ad_free: true,
        premium_effects: true,
        pro_badge: true,
        free_super_votes: 3,
        coin_multiplier: 1.5,
        detailed_analytics: true,
        premium_gifts: true,
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      name: 'Pro Annual',
      apple_product_id: 'pro_annual',
      google_product_id: 'pro_annual',
      price_usd: 39.99,
      duration_months: 12,
      is_active: true,
      features: JSON.stringify({
        ad_free: true,
        premium_effects: true,
        pro_badge: true,
        free_super_votes: 3,
        coin_multiplier: 1.5,
        detailed_analytics: true,
        premium_gifts: true,
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
