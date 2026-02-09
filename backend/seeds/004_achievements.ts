import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  await knex('achievements').del();

  const achievements = [
    // Submission achievements
    { key: 'first_submission', name: 'First Steps', name_ja: '最初の一歩', description: 'Submit your first video', description_ja: '初めての動画を投稿', category: 'submission', tier: 'bronze', requirement_type: 'submission_count', requirement_value: 1, coin_reward: 10 },
    { key: 'submissions_10', name: 'Getting Started', name_ja: '始動', description: 'Submit 10 videos', description_ja: '動画を10本投稿', category: 'submission', tier: 'silver', requirement_type: 'submission_count', requirement_value: 10, coin_reward: 50 },
    { key: 'submissions_50', name: 'Content Creator', name_ja: 'コンテンツクリエイター', description: 'Submit 50 videos', description_ja: '動画を50本投稿', category: 'submission', tier: 'gold', requirement_type: 'submission_count', requirement_value: 50, coin_reward: 200 },
    { key: 'submissions_100', name: 'Prolific Creator', name_ja: '多作クリエイター', description: 'Submit 100 videos', description_ja: '動画を100本投稿', category: 'submission', tier: 'platinum', requirement_type: 'submission_count', requirement_value: 100, coin_reward: 500 },

    // Voting achievements
    { key: 'votes_100', name: 'Active Voter', name_ja: 'アクティブ投票者', description: 'Cast 100 votes', description_ja: '100回投票', category: 'voting', tier: 'bronze', requirement_type: 'vote_count', requirement_value: 100, coin_reward: 20 },
    { key: 'votes_500', name: 'Dedicated Voter', name_ja: '熱心な投票者', description: 'Cast 500 votes', description_ja: '500回投票', category: 'voting', tier: 'silver', requirement_type: 'vote_count', requirement_value: 500, coin_reward: 100 },
    { key: 'votes_1000', name: 'Vote Master', name_ja: '投票マスター', description: 'Cast 1000 votes', description_ja: '1000回投票', category: 'voting', tier: 'gold', requirement_type: 'vote_count', requirement_value: 1000, coin_reward: 300 },

    // Social achievements
    { key: 'first_follow', name: 'Social Butterfly', name_ja: 'ソーシャルバタフライ', description: 'Follow your first user', description_ja: '初めてのフォロー', category: 'social', tier: 'bronze', requirement_type: 'following_count', requirement_value: 1, coin_reward: 5 },
    { key: 'followers_10', name: 'Rising Star', name_ja: 'ライジングスター', description: 'Gain 10 followers', description_ja: 'フォロワー10人達成', category: 'social', tier: 'bronze', requirement_type: 'follower_count', requirement_value: 10, coin_reward: 30 },
    { key: 'followers_100', name: 'Influencer', name_ja: 'インフルエンサー', description: 'Gain 100 followers', description_ja: 'フォロワー100人達成', category: 'social', tier: 'silver', requirement_type: 'follower_count', requirement_value: 100, coin_reward: 150 },
    { key: 'followers_1000', name: 'Celebrity', name_ja: 'セレブリティ', description: 'Gain 1000 followers', description_ja: 'フォロワー1000人達成', category: 'social', tier: 'gold', requirement_type: 'follower_count', requirement_value: 1000, coin_reward: 500 },

    // Milestone achievements
    { key: 'top_3_finish', name: 'Podium Finish', name_ja: '表彰台', description: 'Finish in the top 3', description_ja: 'トップ3入り', category: 'milestone', tier: 'gold', requirement_type: 'rank', requirement_value: 3, coin_reward: 100 },
    { key: 'top_1_finish', name: 'Champion', name_ja: 'チャンピオン', description: 'Win a challenge', description_ja: 'チャレンジで優勝', category: 'milestone', tier: 'platinum', requirement_type: 'rank', requirement_value: 1, coin_reward: 300 },
    { key: 'win_streak_3', name: 'Hot Streak', name_ja: 'ホットストリーク', description: 'Win 3 challenges in a row', description_ja: '3連続優勝', category: 'milestone', tier: 'platinum', requirement_type: 'win_streak', requirement_value: 3, coin_reward: 500 },
    { key: 'earn_1000_coins', name: 'Spark Collector', name_ja: 'スパークコレクター', description: 'Earn 1000 Sparks total', description_ja: '合計1000スパーク獲得', category: 'milestone', tier: 'silver', requirement_type: 'total_coins_earned', requirement_value: 1000, coin_reward: 100 },
  ];

  await knex('achievements').insert(
    achievements.map((a) => ({
      id: uuidv4(),
      key: a.key,
      name: a.name,
      name_ja: a.name_ja,
      description: a.description,
      description_ja: a.description_ja,
      icon_url: `/assets/achievements/${a.key}.png`,
      category: a.category,
      tier: a.tier,
      requirement_type: a.requirement_type,
      requirement_value: a.requirement_value,
      coin_reward: a.coin_reward,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    }))
  );
}
