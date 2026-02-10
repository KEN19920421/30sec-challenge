import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { creditCoins } from './coin.service';

const DAILY_REWARD_AMOUNT = 3; // Sparks

/**
 * Claims the daily login reward for the user.
 * Uses UNIQUE(user_id, reward_date) constraint to prevent double-claiming.
 * Returns the reward record or null if already claimed today.
 */
export async function claimDailyReward(
  userId: string,
): Promise<{ claimed: boolean; amount: number }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Insert will fail on UNIQUE constraint if already claimed
    const [reward] = await db('daily_login_rewards')
      .insert({
        user_id: userId,
        reward_date: today,
        coin_amount: DAILY_REWARD_AMOUNT,
      })
      .returning('*');

    // Credit the coins
    await creditCoins(
      userId,
      DAILY_REWARD_AMOUNT,
      'reward',
      'daily_login',
      reward.id,
      'Daily login bonus',
    );

    logger.info('Daily login reward claimed', { userId, amount: DAILY_REWARD_AMOUNT, date: today });

    return { claimed: true, amount: DAILY_REWARD_AMOUNT };
  } catch (error: any) {
    // UNIQUE constraint violation = already claimed
    if (error.code === '23505') {
      return { claimed: false, amount: 0 };
    }
    throw error;
  }
}

/**
 * Checks if the user has claimed today's reward.
 */
export async function getDailyRewardStatus(
  userId: string,
): Promise<{ claimedToday: boolean; amount: number }> {
  const today = new Date().toISOString().split('T')[0];

  const existing = await db('daily_login_rewards')
    .where({ user_id: userId, reward_date: today })
    .first();

  return {
    claimedToday: !!existing,
    amount: DAILY_REWARD_AMOUNT,
  };
}
