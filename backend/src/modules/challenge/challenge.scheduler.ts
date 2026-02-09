import cron from 'node-cron';
import db from '../../config/database';
import redis from '../../config/redis';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Lock helpers
// ---------------------------------------------------------------------------

/**
 * Acquires a distributed lock via Redis SET NX EX to prevent multiple
 * instances from running the same scheduler tick concurrently.
 *
 * @returns `true` if the lock was acquired, `false` if another instance holds it.
 */
async function acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

// ---------------------------------------------------------------------------
// Scheduled tasks
// ---------------------------------------------------------------------------

/**
 * Activates challenges whose `starts_at` has been reached.
 *
 * Transition: `scheduled` -> `active`
 */
async function activateScheduledChallenges(): Promise<void> {
  const lockKey = 'lock:scheduler:activate';

  if (!(await acquireLock(lockKey, 55))) {
    return; // Another instance is processing
  }

  try {
    const now = new Date().toISOString();

    const challenges = await db('challenges')
      .where('status', 'scheduled')
      .where('starts_at', '<=', now)
      .select('id', 'title');

    if (challenges.length === 0) return;

    for (const challenge of challenges) {
      await db('challenges')
        .where({ id: challenge.id })
        .update({
          status: 'active',
          updated_at: db.fn.now(),
        });

      logger.info('Scheduler: activated challenge', {
        challengeId: challenge.id,
        title: challenge.title,
      });
    }

    // Invalidate cache
    await redis.del('challenge:current', 'challenge:upcoming');
  } catch (error) {
    logger.error('Scheduler: failed to activate challenges', {
      error: (error as Error).message,
    });
  }
}

/**
 * Transitions active challenges whose submission period has ended to the
 * voting phase.
 *
 * Transition: `active` -> `voting`
 */
async function transitionToVoting(): Promise<void> {
  const lockKey = 'lock:scheduler:voting';

  if (!(await acquireLock(lockKey, 55))) {
    return;
  }

  try {
    const now = new Date().toISOString();

    const challenges = await db('challenges')
      .where('status', 'active')
      .where('ends_at', '<=', now)
      .select('id', 'title');

    if (challenges.length === 0) return;

    for (const challenge of challenges) {
      await db('challenges')
        .where({ id: challenge.id })
        .update({
          status: 'voting',
          updated_at: db.fn.now(),
        });

      logger.info('Scheduler: challenge moved to voting', {
        challengeId: challenge.id,
        title: challenge.title,
      });
    }

    await redis.del('challenge:current', 'challenge:upcoming');
  } catch (error) {
    logger.error('Scheduler: failed to transition challenges to voting', {
      error: (error as Error).message,
    });
  }
}

/**
 * Completes challenges whose voting period has ended.
 *
 * Transition: `voting` -> `completed`
 */
async function completeVotingChallenges(): Promise<void> {
  const lockKey = 'lock:scheduler:complete';

  if (!(await acquireLock(lockKey, 55))) {
    return;
  }

  try {
    const now = new Date().toISOString();

    const challenges = await db('challenges')
      .where('status', 'voting')
      .where('voting_ends_at', '<=', now)
      .select('id', 'title');

    if (challenges.length === 0) return;

    for (const challenge of challenges) {
      await db('challenges')
        .where({ id: challenge.id })
        .update({
          status: 'completed',
          updated_at: db.fn.now(),
        });

      logger.info('Scheduler: challenge completed', {
        challengeId: challenge.id,
        title: challenge.title,
      });
    }

    await redis.del('challenge:current', 'challenge:upcoming');
  } catch (error) {
    logger.error('Scheduler: failed to complete voting challenges', {
      error: (error as Error).message,
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Starts the challenge lifecycle scheduler.
 *
 * Runs every minute and checks for state transitions:
 *   scheduled -> active   (starts_at reached)
 *   active    -> voting   (ends_at reached)
 *   voting    -> completed (voting_ends_at reached)
 *
 * Safe to call in multi-instance deployments -- uses Redis-based distributed locks.
 */
export function startChallengeScheduler(): void {
  if (scheduledTask) {
    logger.warn('Challenge scheduler is already running');
    return;
  }

  // Run every minute
  scheduledTask = cron.schedule('* * * * *', async () => {
    logger.debug('Challenge scheduler tick');

    // Run all three checks concurrently
    await Promise.allSettled([
      activateScheduledChallenges(),
      transitionToVoting(),
      completeVotingChallenges(),
    ]);
  });

  logger.info('Challenge scheduler started (every minute)');
}

/**
 * Stops the challenge scheduler gracefully.
 */
export function stopChallengeScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Challenge scheduler stopped');
  }
}
