import cron from 'node-cron';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { addJob } from '../queues';
import { expireBoosts } from '../../modules/boost/boost.service';

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
 * Starts all maintenance scheduled jobs.
 *
 * Schedule (UTC):
 *   Every 5 minutes  - Refresh materialized views
 *   Every 15 minutes - Clean up expired vote queue entries
 *   Every hour       - Clean up failed / stuck transcodes
 *
 * Uses Redis distributed locks to ensure only one instance enqueues each job.
 */
export function startMaintenanceScheduler(): void {
  if (tasks.length > 0) {
    logger.warn('Maintenance scheduler is already running');
    return;
  }

  // -----------------------------------------------------------------------
  // Every 5 minutes: refresh materialized views
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule('*/5 * * * *', async () => {
      const lockKey = 'lock:scheduler:refresh_views';
      if (!(await acquireLock(lockKey, 240))) return; // Lock for 4 minutes

      try {
        await addJob('analytics', 'refresh_views', {}, {
          // Deduplicate: only one refresh_views job at a time
          jobId: 'refresh_views_periodic',
        });
        logger.debug('Maintenance scheduler: enqueued refresh_views');
      } catch (err) {
        logger.error('Maintenance scheduler: failed to enqueue refresh_views', {
          error: (err as Error).message,
        });
      }
    }),
  );

  // -----------------------------------------------------------------------
  // Every 15 minutes: clean up expired vote queue entries
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule('*/15 * * * *', async () => {
      const lockKey = 'lock:scheduler:expired_vote_queues';
      if (!(await acquireLock(lockKey, 840))) return; // Lock for 14 minutes

      try {
        await addJob('cleanup', 'expired_vote_queues', {});
        logger.debug('Maintenance scheduler: enqueued expired_vote_queues cleanup');
      } catch (err) {
        logger.error('Maintenance scheduler: failed to enqueue expired_vote_queues', {
          error: (err as Error).message,
        });
      }
    }),
  );

  // -----------------------------------------------------------------------
  // Every hour: clean up failed / stuck transcodes
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule('0 * * * *', async () => {
      const lockKey = 'lock:scheduler:failed_transcodes';
      if (!(await acquireLock(lockKey, 3500))) return; // Lock for ~58 minutes

      try {
        await addJob('cleanup', 'failed_transcodes', {});
        logger.debug('Maintenance scheduler: enqueued failed_transcodes cleanup');
      } catch (err) {
        logger.error('Maintenance scheduler: failed to enqueue failed_transcodes', {
          error: (err as Error).message,
        });
      }
    }),
  );

  // -----------------------------------------------------------------------
  // Every 5 minutes: expire stale boosts and recalculate scores
  // -----------------------------------------------------------------------
  tasks.push(
    cron.schedule('*/5 * * * *', async () => {
      const lockKey = 'lock:scheduler:expire_boosts';
      if (!(await acquireLock(lockKey, 240))) return; // Lock for 4 minutes

      try {
        const cleaned = await expireBoosts();
        if (cleaned > 0) {
          logger.debug('Maintenance scheduler: expired boosts cleaned', { count: cleaned });
        }
      } catch (err) {
        logger.error('Maintenance scheduler: failed to expire boosts', {
          error: (err as Error).message,
        });
      }
    }),
  );

  logger.info('Maintenance scheduler started (4 cron jobs)');
}

/**
 * Stops all maintenance scheduled jobs.
 */
export function stopMaintenanceScheduler(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  logger.info('Maintenance scheduler stopped');
}
