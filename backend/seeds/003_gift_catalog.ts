import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  await knex('gift_catalog').del();

  const gifts = [
    // Quick Reactions (5-20 coins)
    { name: 'Fire', name_ja: 'ファイヤー', category: 'quick_reaction', coin_cost: 5, sort_order: 1 },
    { name: 'Clap', name_ja: '拍手', category: 'quick_reaction', coin_cost: 10, sort_order: 2 },
    { name: 'Heart Eyes', name_ja: 'ハート目', category: 'quick_reaction', coin_cost: 10, sort_order: 3 },
    { name: 'LOL', name_ja: '大爆笑', category: 'quick_reaction', coin_cost: 15, sort_order: 4 },
    { name: 'Mind Blown', name_ja: 'マインドブロウン', category: 'quick_reaction', coin_cost: 20, sort_order: 5 },

    // Standard (50-200 coins)
    { name: 'Star', name_ja: 'スター', category: 'standard', coin_cost: 50, sort_order: 10 },
    { name: 'Trophy', name_ja: 'トロフィー', category: 'standard', coin_cost: 100, sort_order: 11 },
    { name: 'Crown', name_ja: 'クラウン', category: 'standard', coin_cost: 150, sort_order: 12 },
    { name: 'Diamond', name_ja: 'ダイヤモンド', category: 'standard', coin_cost: 200, sort_order: 13 },

    // Premium (500-2000 coins)
    { name: 'Spotlight', name_ja: 'スポットライト', category: 'premium', coin_cost: 500, sort_order: 20 },
    { name: 'Rocket', name_ja: 'ロケット', category: 'premium', coin_cost: 1000, sort_order: 21 },
    { name: 'Legendary', name_ja: 'レジェンダリー', category: 'premium', coin_cost: 2000, sort_order: 22 },
  ];

  await knex('gift_catalog').insert(
    gifts.map((gift) => ({
      id: uuidv4(),
      name: gift.name,
      name_ja: gift.name_ja,
      icon_url: `/assets/gifts/${gift.name.toLowerCase().replace(/\s+/g, '_')}.png`,
      animation_url: `/assets/animations/${gift.name.toLowerCase().replace(/\s+/g, '_')}.json`,
      category: gift.category,
      coin_cost: gift.coin_cost,
      creator_coin_share: Math.floor(gift.coin_cost / 2),
      is_active: true,
      sort_order: gift.sort_order,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    }))
  );
}
