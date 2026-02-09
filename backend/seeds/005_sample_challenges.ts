import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  await knex('challenges').del();

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const addHours = (date: Date, hours: number) =>
    new Date(date.getTime() + hours * 60 * 60 * 1000);

  await knex('challenges').insert([
    {
      id: uuidv4(),
      title: 'Best Dance Move',
      title_ja: 'ベストダンスムーブ',
      description: 'Show us your best dance move in 30 seconds! Any style goes - hip hop, breakdance, contemporary, or your own unique moves.',
      description_ja: '30秒であなたの最高のダンスムーブを見せて！ヒップホップ、ブレイクダンス、コンテンポラリー、オリジナルムーブなんでもOK。',
      category: 'dance',
      difficulty: 'medium',
      status: 'active',
      starts_at: addHours(now, -12),
      ends_at: addHours(now, 12),
      voting_ends_at: addHours(now, 36),
      is_premium_early_access: false,
      early_access_hours: 2,
      submission_count: 0,
      total_votes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      title: 'Make Us Laugh',
      title_ja: '笑わせて！',
      description: 'Your funniest skit, joke, or comedy bit in 30 seconds. Make the audience laugh!',
      description_ja: '30秒で最高に面白いスキット、ジョーク、コメディを。みんなを笑わせよう！',
      category: 'comedy',
      difficulty: 'easy',
      status: 'scheduled',
      starts_at: tomorrow,
      ends_at: addHours(tomorrow, 24),
      voting_ends_at: addHours(tomorrow, 48),
      is_premium_early_access: true,
      early_access_hours: 2,
      submission_count: 0,
      total_votes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      title: 'Hidden Talent',
      title_ja: '隠れた才能',
      description: 'Show off a talent nobody expects! Card tricks, impressions, unusual skills - surprise us!',
      description_ja: '誰も予想しない才能を披露しよう！カードマジック、モノマネ、珍しいスキル。驚かせて！',
      category: 'talent',
      difficulty: 'medium',
      status: 'scheduled',
      starts_at: dayAfter,
      ends_at: addHours(dayAfter, 24),
      voting_ends_at: addHours(dayAfter, 48),
      is_premium_early_access: true,
      early_access_hours: 2,
      submission_count: 0,
      total_votes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      title: 'Creative Cooking',
      title_ja: 'クリエイティブクッキング',
      description: 'Create something delicious in 30 seconds! Speed cooking, plating art, or food hacks welcome.',
      description_ja: '30秒で美味しいものを作ろう！スピードクッキング、盛り付けアート、フードハックも歓迎。',
      category: 'creative',
      difficulty: 'hard',
      status: 'scheduled',
      starts_at: threeDays,
      ends_at: addHours(threeDays, 24),
      voting_ends_at: addHours(threeDays, 48),
      is_premium_early_access: false,
      early_access_hours: 2,
      submission_count: 0,
      total_votes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      title: '30-Second Workout',
      title_ja: '30秒ワークアウト',
      description: 'Show your most intense or creative workout routine in just 30 seconds. Get those reps in!',
      description_ja: '30秒で最も激しい、またはクリエイティブなワークアウトルーティンを見せて。レップを重ねよう！',
      category: 'fitness',
      difficulty: 'medium',
      status: 'scheduled',
      starts_at: fourDays,
      ends_at: addHours(fourDays, 24),
      voting_ends_at: addHours(fourDays, 48),
      is_premium_early_access: true,
      early_access_hours: 2,
      submission_count: 0,
      total_votes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
}
