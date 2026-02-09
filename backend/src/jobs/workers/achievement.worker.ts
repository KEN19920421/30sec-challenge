import { Worker, Job } from 'bullmq';
import { db } from '../../config/database';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Redis connection config
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: parsed.password } : {}),
  };
}

const connection = parseRedisUrl(REDIS_URL);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckAchievementsData {
  userId: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
  coin_reward: number;
  icon_url: string | null;
}

// ---------------------------------------------------------------------------
// Achievement checkers
// ---------------------------------------------------------------------------

/**
 * Fetches the user's current stat for a given criteria type.
 */
async function getUserStatForCriteria(
  userId: string,
  criteriaType: string,
): Promise<number> {
  switch (criteriaType) {
    case 'submission_count': {
      const user = await db('users').where('id', userId).first('submissions_count');
      return user?.submissions_count ?? 0;
    }

    case 'vote_count': {
      const [{ count }] = await db('votes')
        .where('user_id', userId)
        .count('id as count');
      return Number(count);
    }

    case 'follower_count': {
      const user = await db('users').where('id', userId).first('followers_count');
      return user?.followers_count ?? 0;
    }

    case 'rank': {
      // Check for any top-N finishes in leaderboard snapshots.
      // criteria_value represents the rank threshold (e.g. 1 = first place, 3 = top 3).
      // We return the best (lowest) rank the user has ever achieved.
      const best = await db('leaderboard_snapshots')
        .where('user_id', userId)
        .orderBy('rank', 'asc')
        .first('rank');
      // Return the rank, or Infinity if no snapshot exists (will never satisfy criteria).
      return best?.rank ?? Infinity;
    }

    default:
      logger.warn('Unknown achievement criteria type', { criteriaType, userId });
      return 0;
  }
}

/**
 * Determines whether a user's stat satisfies the achievement criteria.
 * For rank-based achievements, lower is better (rank <= criteria_value).
 * For count-based achievements, higher is better (count >= criteria_value).
 */
function meetsCriteria(
  criteriaType: string,
  currentValue: number,
  requiredValue: number,
): boolean {
  if (criteriaType === 'rank') {
    return currentValue <= requiredValue;
  }
  return currentValue >= requiredValue;
}

/**
 * Awards an achievement to a user: inserts the record, credits coins,
 * and creates a notification.
 */
async function awardAchievement(
  userId: string,
  achievement: Achievement,
): Promise<void> {
  await db.transaction(async (trx) => {
    // Insert user_achievement
    await trx('user_achievements').insert({
      user_id: userId,
      achievement_id: achievement.id,
      earned_at: trx.fn.now(),
    });

    // Credit coin reward
    if (achievement.coin_reward > 0) {
      await trx('users')
        .where('id', userId)
        .increment('coin_balance', achievement.coin_reward);

      // Record the coin transaction
      await trx('coin_transactions').insert({
        user_id: userId,
        amount: achievement.coin_reward,
        type: 'achievement_reward',
        reference_type: 'achievement',
        reference_id: achievement.id,
        description: `Achievement unlocked: ${achievement.name}`,
        created_at: trx.fn.now(),
      });
    }

    // Create notification
    await trx('notifications').insert({
      user_id: userId,
      type: 'achievement_unlocked',
      title: 'Achievement Unlocked!',
      body: `You earned "${achievement.name}" — ${achievement.description}`,
      data: JSON.stringify({
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        coin_reward: achievement.coin_reward,
        icon_url: achievement.icon_url,
      }),
      created_at: trx.fn.now(),
    });
  });

  logger.info('Achievement awarded', {
    userId,
    achievementId: achievement.id,
    name: achievement.name,
    coinReward: achievement.coin_reward,
  });
}

// ---------------------------------------------------------------------------
// Main job processor
// ---------------------------------------------------------------------------

async function processCheckAchievements(job: Job<CheckAchievementsData>): Promise<void> {
  const { userId } = job.data;

  logger.debug('Checking achievements for user', { userId, jobId: job.id });

  // Verify user exists and is active
  const user = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id');

  if (!user) {
    logger.warn('Achievement check skipped: user not found or deleted', { userId });
    return;
  }

  // Fetch all achievements
  const achievements: Achievement[] = await db('achievements').select('*');

  if (achievements.length === 0) {
    logger.debug('No achievements defined, skipping check', { userId });
    return;
  }

  // Fetch already-earned achievement IDs for this user
  const earnedRows = await db('user_achievements')
    .where('user_id', userId)
    .select('achievement_id');

  const earnedSet = new Set(earnedRows.map((r: { achievement_id: string }) => r.achievement_id));

  // Group achievements by criteria type to batch stat lookups
  const byCriteriaType = new Map<string, Achievement[]>();
  for (const achievement of achievements) {
    if (earnedSet.has(achievement.id)) continue; // Already earned

    const list = byCriteriaType.get(achievement.criteria_type) || [];
    list.push(achievement);
    byCriteriaType.set(achievement.criteria_type, list);
  }

  // Check each criteria type
  let awarded = 0;

  for (const [criteriaType, candidates] of byCriteriaType) {
    const currentValue = await getUserStatForCriteria(userId, criteriaType);

    for (const achievement of candidates) {
      if (meetsCriteria(criteriaType, currentValue, achievement.criteria_value)) {
        try {
          await awardAchievement(userId, achievement);
          awarded++;
        } catch (err) {
          // Unique constraint violation means it was already awarded (race condition)
          if ((err as any)?.code === '23505') {
            logger.debug('Achievement already awarded (concurrent)', {
              userId,
              achievementId: achievement.id,
            });
          } else {
            throw err;
          }
        }
      }
    }
  }

  logger.info('Achievement check completed', { userId, checked: achievements.length, awarded });
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

/**
 * Starts the achievement worker. Safe to call multiple times -- subsequent
 * calls are no-ops.
 */
export function startAchievementWorker(): Worker {
  if (worker) {
    logger.warn('Achievement worker is already running');
    return worker;
  }

  worker = new Worker(
    'achievement',
    async (job: Job) => {
      switch (job.name) {
        case 'check_achievements':
          await processCheckAchievements(job as Job<CheckAchievementsData>);
          break;

        default:
          logger.warn('Achievement worker: unknown job type', { jobName: job.name });
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 20,
        duration: 1000,
      },
    },
  );

  worker.on('completed', (job) => {
    logger.debug('Achievement job completed', { jobId: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Achievement job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Achievement worker error', { error: err.message });
  });

  logger.info('Achievement worker started');

  return worker;
}

/**
 * Gracefully shuts down the achievement worker.
 */
export async function stopAchievementWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Achievement worker stopped');
  }
}
