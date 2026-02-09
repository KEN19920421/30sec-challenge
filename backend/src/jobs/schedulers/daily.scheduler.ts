import cron from 'node-cron';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { addJob } from '../queues';

// ---------------------------------------------------------------------------
// Distributed lock helper
// ---------------------------------------------------------------------------

/**
 * Acquires a distributed lock via Redis SET NX EX.
 * Prevents multiple instances from enqueueing the same job.
 */
async function acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

// ---------------------------------------------------------------------------
// Scheduled tasks
// ---------------------------------------------------------------------------

const tasks: cron.ScheduledTask[] = [];

/**
 * Starts all daily scheduled jobs.
 *
 * Schedule (UTC):
 *   00:00 - Aggregate previous day's statistics
 *   00:00 - Check for expired subscriptions
 *   02:00 - Clean up old notifications (>90 days)
 *   03:00 - Purge soft-deleted users (>30 days)
 *
 * Uses Redis distributed locks to ensure only one instance enqueues each job.
 */
export function startDailyScheduler(): void {
  if (tasks.length > 0) {
    logger.warn('Daily scheduler is already running');
    return;
  }

  // -----------------------------------------------------------------------
  // Every day at midnight UTC: aggregate previous day's stats
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule(
      '0 0 * * *',
      async () => {
        const lockKey = 'lock:scheduler:daily_stats';
        if (!(await acquireLock(lockKey, 3600))) return;

        try {
          // Compute previous day's date
          const yesterday = new Date();
          yesterday.setUTCDate(yesterday.getUTCDate() - 1);
          const date = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD'

          await addJob('analytics', 'daily_stats', { date });
          logger.info('Daily scheduler: enqueued daily_stats', { date });
        } catch (err) {
          logger.error('Daily scheduler: failed to enqueue daily_stats', {
            error: (err as Error).message,
          });
        }
      },
      { timezone: 'UTC' },
    ),
  );

  // -----------------------------------------------------------------------
  // Every day at midnight UTC: check expired subscriptions
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule(
      '0 0 * * *',
      async () => {
        const lockKey = 'lock:scheduler:expired_subs';
        if (!(await acquireLock(lockKey, 3600))) return;

        try {
          await addJob('cleanup', 'expired_subscriptions', {});
          logger.info('Daily scheduler: enqueued expired_subscriptions cleanup');
        } catch (err) {
          logger.error('Daily scheduler: failed to enqueue expired_subscriptions', {
            error: (err as Error).message,
          });
        }
      },
      { timezone: 'UTC' },
    ),
  );

  // -----------------------------------------------------------------------
  // Every day at 2:00 AM UTC: clean up old notifications
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule(
      '0 2 * * *',
      async () => {
        const lockKey = 'lock:scheduler:old_notifications';
        if (!(await acquireLock(lockKey, 3600))) return;

        try {
          await addJob('cleanup', 'old_notifications', {});
          logger.info('Daily scheduler: enqueued old_notifications cleanup');
        } catch (err) {
          logger.error('Daily scheduler: failed to enqueue old_notifications', {
            error: (err as Error).message,
          });
        }
      },
      { timezone: 'UTC' },
    ),
  );

  // -----------------------------------------------------------------------
  // Every day at 3:00 AM UTC: purge soft-deleted users
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule(
      '0 3 * * *',
      async () => {
        const lockKey = 'lock:scheduler:soft_deleted_users';
        if (!(await acquireLock(lockKey, 3600))) return;

        try {
          await addJob('cleanup', 'soft_deleted_users', {});
          logger.info('Daily scheduler: enqueued soft_deleted_users cleanup');
        } catch (err) {
          logger.error('Daily scheduler: failed to enqueue soft_deleted_users', {
            error: (err as Error).message,
          });
        }
      },
      { timezone: 'UTC' },
    ),
  );

  logger.info('Daily scheduler started (4 cron jobs)');
}

/**
 * Stops all daily scheduled jobs.
 */
export function stopDailyScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  logger.info('Daily scheduler stopped');
}
