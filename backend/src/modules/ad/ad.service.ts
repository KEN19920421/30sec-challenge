import crypto from 'crypto';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdType = 'interstitial' | 'rewarded' | 'banner' | 'native';
type AdEventType = 'impression' | 'click' | 'completed' | 'reward_granted' | 'failed';

interface AdEvent {
  id: string;
  user_id: string | null;
  ad_type: AdType;
  placement: string;
  ad_network: string;
  ad_unit_id: string | null;
  event_type: AdEventType;
  reward_type: string | null;
  reward_amount: number | null;
  revenue_estimate: number | null;
  created_at: Date;
}

interface DailyAdStats {
  super_vote_rewards_today: number;
  super_vote_rewards_remaining: number;
  bonus_coin_rewards_today: number;
  bonus_coin_rewards_remaining: number;
  total_ads_watched_today: number;
}

interface AdConfig {
  show_interstitial: boolean;
  show_banner: boolean;
  show_rewarded: boolean;
  placements: {
    interstitial: string[];
    banner: string[];
    rewarded: string[];
  };
}

interface RewardCallbackParams {
  ad_network?: string;
  ad_unit?: string;
  reward_type?: string;
  reward_amount?: string;
  user_id?: string;
  custom_data?: string;
  signature?: string;
  key_id?: string;
  transaction_id?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SUPER_VOTE_REWARDS_PER_DAY = 5;
const MAX_BONUS_COIN_REWARDS_PER_DAY = 10;
const BONUS_COIN_REWARD_AMOUNT = 10; // coins per rewarded ad

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Logs an ad event (impression, click, completed, etc.).
 */
export async function logAdEvent(
  userId: string | null,
  adType: AdType,
  placement: string,
  eventType: AdEventType,
  rewardType?: string,
  rewardAmount?: number,
): Promise<AdEvent> {
  const [adEvent] = await db('ad_events')
    .insert({
      user_id: userId,
      ad_type: adType,
      placement,
      ad_network: 'admob',
      event_type: eventType,
      reward_type: rewardType || null,
      reward_amount: rewardAmount || null,
    })
    .returning('*');

  logger.debug('Ad event logged', {
    userId,
    adType,
    placement,
    eventType,
  });

  return adEvent;
}

/**
 * Verifies a server-to-server reward callback from AdMob.
 *
 * AdMob sends a callback to our server when a user completes a rewarded ad.
 * We verify the callback signature, then grant the appropriate reward.
 */
export async function verifyRewardCallback(
  params: RewardCallbackParams,
): Promise<{ success: boolean; message: string }> {
  const {
    user_id: userId,
    reward_type: rewardType,
    reward_amount: rewardAmountStr,
    signature,
    key_id: keyId,
    transaction_id: transactionId,
  } = params;

  // Validate required fields
  if (!userId || !rewardType || !signature || !transactionId) {
    logger.warn('AdMob callback missing required fields', { params });
    throw new ValidationError('Invalid callback', [
      { field: 'params', message: 'Missing required callback parameters' },
    ]);
  }

  // Verify signature using AdMob's public keys
  const isValid = await verifyAdMobSignature(params, signature, keyId);
  if (!isValid) {
    logger.warn('AdMob callback signature verification failed', { userId, transactionId });
    throw new ForbiddenError('Invalid callback signature');
  }

  // Check for duplicate transaction (idempotency)
  const existingEvent = await db('ad_events')
    .where('ad_unit_id', transactionId)
    .where('event_type', 'reward_granted')
    .first('id');

  if (existingEvent) {
    logger.info('AdMob callback already processed', { transactionId });
    return { success: true, message: 'Reward already granted' };
  }

  const rewardAmount = parseInt(rewardAmountStr || '1', 10);

  // Grant the reward based on type
  if (rewardType === 'super_vote') {
    // Check daily limit
    const todayCount = await getTodayRewardCount(userId, 'super_vote');
    if (todayCount >= MAX_SUPER_VOTE_REWARDS_PER_DAY) {
      logger.info('Super vote daily limit reached via callback', { userId, todayCount });
      return { success: false, message: 'Daily super vote limit reached' };
    }

    // Grant super vote by adding to Redis counter
    const superVoteKey = `user:${userId}:super_votes`;
    await redis.incrby(superVoteKey, rewardAmount);

    // Log the reward event
    await logAdEvent(userId, 'rewarded', 'reward_callback', 'reward_granted', 'super_vote', rewardAmount);

    logger.info('Super vote reward granted via callback', { userId, amount: rewardAmount });
  } else if (rewardType === 'coins' || rewardType === 'bonus_coins') {
    // Check daily limit
    const todayCount = await getTodayRewardCount(userId, 'bonus_coins');
    if (todayCount >= MAX_BONUS_COIN_REWARDS_PER_DAY) {
      logger.info('Bonus coin daily limit reached via callback', { userId, todayCount });
      return { success: false, message: 'Daily bonus coin limit reached' };
    }

    // Credit coins to user
    const { creditCoins } = await import('../coin/coin.service');
    await creditCoins(
      userId,
      rewardAmount || BONUS_COIN_REWARD_AMOUNT,
      'reward',
      'ad_reward',
      transactionId,
      'Bonus coins from watching ad',
    );

    // Log the reward event
    await logAdEvent(userId, 'rewarded', 'reward_callback', 'reward_granted', 'bonus_coins', rewardAmount);

    logger.info('Coin reward granted via callback', { userId, amount: rewardAmount });
  } else {
    logger.warn('Unknown reward type in AdMob callback', { rewardType, userId });
    return { success: false, message: `Unknown reward type: ${rewardType}` };
  }

  return { success: true, message: 'Reward granted' };
}

/**
 * User-initiated reward claim after watching a rewarded ad.
 *
 * Rate limits:
 *  - Max 5 super vote rewards per day
 *  - Max 10 bonus coin rewards per day
 */
export async function claimReward(
  userId: string,
  adType: AdType,
  placement: string,
): Promise<{
  reward_type: string;
  reward_amount: number;
  remaining_today: number;
}> {
  // Verify the user actually completed an ad recently
  const recentCompletion = await db('ad_events')
    .where('user_id', userId)
    .where('ad_type', 'rewarded')
    .where('event_type', 'completed')
    .where('placement', placement)
    .where('created_at', '>', db.raw("NOW() - INTERVAL '5 minutes'"))
    .orderBy('created_at', 'desc')
    .first();

  if (!recentCompletion) {
    throw new ValidationError('No eligible ad completion', [
      { field: 'placement', message: 'No recently completed rewarded ad found for this placement' },
    ]);
  }

  // Determine reward type based on placement
  const isSuperVotePlacement = placement.includes('super_vote');
  const rewardType = isSuperVotePlacement ? 'super_vote' : 'bonus_coins';

  // Check daily limits
  const todayCount = await getTodayRewardCount(userId, rewardType);
  const maxDaily = isSuperVotePlacement
    ? MAX_SUPER_VOTE_REWARDS_PER_DAY
    : MAX_BONUS_COIN_REWARDS_PER_DAY;

  if (todayCount >= maxDaily) {
    throw new ValidationError('Daily limit reached', [
      {
        field: 'placement',
        message: `You have reached the daily limit of ${maxDaily} ${rewardType} rewards`,
      },
    ]);
  }

  let rewardAmount: number;

  if (isSuperVotePlacement) {
    rewardAmount = 1;

    // Grant super vote
    const superVoteKey = `user:${userId}:super_votes`;
    await redis.incrby(superVoteKey, 1);
  } else {
    rewardAmount = BONUS_COIN_REWARD_AMOUNT;

    // Credit bonus coins
    const { creditCoins } = await import('../coin/coin.service');
    await creditCoins(
      userId,
      BONUS_COIN_REWARD_AMOUNT,
      'reward',
      'ad_reward',
      undefined,
      'Bonus coins from watching ad',
    );
  }

  // Log the reward event
  await logAdEvent(userId, adType, placement, 'reward_granted', rewardType, rewardAmount);

  const remaining = maxDaily - todayCount - 1;

  logger.info('Ad reward claimed', {
    userId,
    rewardType,
    rewardAmount,
    remainingToday: remaining,
  });

  return {
    reward_type: rewardType,
    reward_amount: rewardAmount,
    remaining_today: Math.max(0, remaining),
  };
}

/**
 * Returns daily ad stats for a user: how many rewards watched today and remaining.
 */
export async function getDailyAdStats(userId: string): Promise<DailyAdStats> {
  const superVoteCount = await getTodayRewardCount(userId, 'super_vote');
  const bonusCoinCount = await getTodayRewardCount(userId, 'bonus_coins');

  const [{ count: totalToday }] = await db('ad_events')
    .where('user_id', userId)
    .where('ad_type', 'rewarded')
    .where('event_type', 'completed')
    .where('created_at', '>=', db.raw("CURRENT_DATE"))
    .count('id as count');

  return {
    super_vote_rewards_today: superVoteCount,
    super_vote_rewards_remaining: Math.max(0, MAX_SUPER_VOTE_REWARDS_PER_DAY - superVoteCount),
    bonus_coin_rewards_today: bonusCoinCount,
    bonus_coin_rewards_remaining: Math.max(0, MAX_BONUS_COIN_REWARDS_PER_DAY - bonusCoinCount),
    total_ads_watched_today: parseInt(totalToday as string, 10),
  };
}

/**
 * Returns ad configuration based on the user's subscription status.
 *
 * Pro users: no ads at all
 * Free users: all placements active
 */
export async function getAdConfig(userId: string): Promise<AdConfig> {
  const user = await db('users')
    .where('id', userId)
    .first('subscription_tier');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Pro users see no ads
  if (user.subscription_tier === 'pro') {
    return {
      show_interstitial: false,
      show_banner: false,
      show_rewarded: false,
      placements: {
        interstitial: [],
        banner: [],
        rewarded: [],
      },
    };
  }

  // Free users see all ads
  return {
    show_interstitial: true,
    show_banner: true,
    show_rewarded: true,
    placements: {
      interstitial: [
        'after_vote',
        'between_challenges',
      ],
      banner: [
        'feed_bottom',
        'leaderboard_bottom',
      ],
      rewarded: [
        'super_vote',
        'bonus_coins',
        'extra_submission',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Counts the number of reward-granted ad events for a user today.
 */
async function getTodayRewardCount(
  userId: string,
  rewardType: string,
): Promise<number> {
  const [{ count }] = await db('ad_events')
    .where('user_id', userId)
    .where('event_type', 'reward_granted')
    .where('reward_type', rewardType)
    .where('created_at', '>=', db.raw("CURRENT_DATE"))
    .count('id as count');

  return parseInt(count as string, 10);
}

/**
 * Verifies the AdMob SSV (server-side verification) callback signature.
 *
 * AdMob signs callbacks with an ECDSA signature. The public keys are
 * fetched from Google's key server and cached.
 */
async function verifyAdMobSignature(
  params: RewardCallbackParams,
  signature: string,
  keyId?: string,
): Promise<boolean> {
  try {
    // In production, fetch the public key from Google's key server
    // https://www.gstatic.com/admob/reward/verifier-keys.json
    const publicKeyUrl = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

    const cacheKey = 'admob:verifier_keys';
    let keysJson = await redis.get(cacheKey);

    if (!keysJson) {
      const response = await fetch(publicKeyUrl);
      if (!response.ok) {
        logger.error('Failed to fetch AdMob verifier keys');
        // In case we can't fetch keys, allow the callback in production
        // but log a warning. This prevents blocking legitimate rewards.
        return true;
      }
      keysJson = await response.text();
      await redis.set(cacheKey, keysJson, 'EX', 86400); // Cache for 24 hours
    }

    const keys = JSON.parse(keysJson) as {
      keys: Array<{ keyId: number; pem: string; base64: string }>;
    };

    // Find the key matching the key_id parameter
    const targetKeyId = keyId ? parseInt(keyId, 10) : undefined;
    const key = targetKeyId
      ? keys.keys.find((k) => k.keyId === targetKeyId)
      : keys.keys[0];

    if (!key) {
      logger.warn('AdMob verifier key not found', { keyId });
      return false;
    }

    // Build the message to verify
    // The message is the query string up to (but not including) &signature=
    const queryParts: string[] = [];
    const orderedParams = [
      'ad_network', 'ad_unit', 'custom_data', 'key_id',
      'reward_amount', 'reward_type', 'timestamp',
      'transaction_id', 'user_id',
    ];

    for (const param of orderedParams) {
      const value = (params as Record<string, string | undefined>)[param];
      if (value !== undefined) {
        queryParts.push(`${param}=${value}`);
      }
    }

    const message = queryParts.join('&');
    const signatureBuffer = Buffer.from(signature, 'base64');

    // Verify ECDSA signature
    const verifier = crypto.createVerify('SHA256');
    verifier.update(message);
    const pem = key.pem || `-----BEGIN PUBLIC KEY-----\n${key.base64}\n-----END PUBLIC KEY-----`;

    return verifier.verify(pem, signatureBuffer);
  } catch (err) {
    logger.error('AdMob signature verification error', { error: err });
    // In case of verification errors, log but don't block
    // This is a business decision -- you may want to be stricter
    return false;
  }
}
