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
// Job processors
// ---------------------------------------------------------------------------

/**
 * Deletes vote_queue entries for challenges that have completed.
 */
async function processExpiredVoteQueues(job: Job): Promise<void> {
  logger.debug('Cleaning up expired vote queues', { jobId: job.id });

  const completedChallengeIds = await db('challenges')
    .where('status', 'completed')
    .select('id');

  if (completedChallengeIds.length === 0) {
    logger.debug('No completed challenges to clean vote queues for');
    return;
  }

  const ids = completedChallengeIds.map((c: { id: string }) => c.id);

  const deleted = await db('vote_queue')
    .whereIn('challenge_id', ids)
    .del();

  logger.info('Expired vote queue entries cleaned', { deleted, challengeCount: ids.length });
}

/**
 * Deletes notifications older than 90 days.
 */
async function processOldNotifications(job: Job): Promise<void> {
  logger.debug('Cleaning up old notifications', { jobId: job.id });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const deleted = await db('notifications')
    .where('created_at', '<', cutoff.toISOString())
    .del();

  logger.info('Old notifications cleaned', { deleted, cutoffDate: cutoff.toISOString() });
}

/**
 * Cleans up submissions stuck in 'processing' for more than 1 hour by
 * marking them as failed and notifying the user.
 */
async function processFailedTranscodes(job: Job): Promise<void> {
  logger.debug('Cleaning up failed transcodes', { jobId: job.id });

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const stuckSubmissions = await db('submissions')
    .where('transcode_status', 'processing')
    .where('updated_at', '<', oneHourAgo.toISOString())
    .select('id');

  if (stuckSubmissions.length === 0) {
    logger.debug('No stuck transcodes found');
    return;
  }

  let failed = 0;

  for (const submission of stuckSubmissions) {
    await db('submissions')
      .where('id', submission.id)
      .update({
        transcode_status: 'failed',
        updated_at: db.fn.now(),
      });

    // Notify the user about the failure
    const sub = await db('submissions')
      .where('id', submission.id)
      .first('user_id');

    if (sub) {
      await db('notifications').insert({
        user_id: sub.user_id,
        type: 'submission_failed',
        title: 'Submission Processing Failed',
        body: 'Your video submission could not be processed. Please try uploading again.',
        data: JSON.stringify({ submission_id: submission.id }),
        created_at: db.fn.now(),
      });
    }

    failed++;
  }

  logger.info('Failed transcodes cleanup completed', {
    total: stuckSubmissions.length,
    markedFailed: failed,
  });
}

/**
 * Checks for expired subscriptions and updates their status.
 */
async function processExpiredSubscriptions(job: Job): Promise<void> {
  logger.debug('Checking expired subscriptions', { jobId: job.id });

  const now = new Date().toISOString();

  // Find active subscriptions that have passed their end date
  const expired = await db('subscriptions')
    .where('status', 'active')
    .where('ends_at', '<', now)
    .select('id', 'user_id');

  if (expired.length === 0) {
    logger.debug('No expired subscriptions found');
    return;
  }

  for (const subscription of expired) {
    await db.transaction(async (trx) => {
      // Mark subscription as expired
      await trx('subscriptions')
        .where('id', subscription.id)
        .update({
          status: 'expired',
          updated_at: trx.fn.now(),
        });

      // Downgrade user to free tier
      await trx('users')
        .where('id', subscription.user_id)
        .update({
          subscription_tier: 'free',
          updated_at: trx.fn.now(),
        });

      // Notify the user
      await trx('notifications').insert({
        user_id: subscription.user_id,
        type: 'subscription_expired',
        title: 'Subscription Expired',
        body: 'Your subscription has expired. Renew to continue enjoying premium features.',
        data: JSON.stringify({ subscription_id: subscription.id }),
        created_at: trx.fn.now(),
      });
    });
  }

  logger.info('Expired subscriptions processed', { count: expired.length });
}

/**
 * Permanently deletes users who were soft-deleted more than 30 days ago.
 * Cascades through related data.
 */
async function processSoftDeletedUsers(job: Job): Promise<void> {
  logger.debug('Cleaning up soft-deleted users', { jobId: job.id });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const users = await db('users')
    .whereNotNull('deleted_at')
    .where('deleted_at', '<', cutoff.toISOString())
    .select('id', 'username');

  if (users.length === 0) {
    logger.debug('No soft-deleted users to purge');
    return;
  }

  for (const user of users) {
    await db.transaction(async (trx) => {
      const userId = user.id;

      // Delete related data in dependency order
      await trx('notifications').where('user_id', userId).del();
      await trx('user_achievements').where('user_id', userId).del();
      await trx('coin_transactions').where('user_id', userId).del();
      await trx('votes').where('user_id', userId).del();
      await trx('vote_queue').where('user_id', userId).del();
      await trx('gifts').where('sender_id', userId).del();
      await trx('reports').where('reporter_id', userId).del();
      await trx('follows').where('follower_id', userId).orWhere('following_id', userId).del();
      await trx('subscriptions').where('user_id', userId).del();
      await trx('submissions').where('user_id', userId).del();
      await trx('leaderboard_snapshots').where('user_id', userId).del();

      // Finally delete the user
      await trx('users').where('id', userId).del();

      logger.info('Permanently deleted user', { userId, username: user.username });
    });
  }

  logger.info('Soft-deleted users purge completed', { purged: users.length });
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

/**
 * Starts the cleanup worker. Safe to call multiple times.
 */
export function startCleanupWorker(): Worker {
  if (worker) {
    logger.warn('Cleanup worker is already running');
    return worker;
  }

  worker = new Worker(
    'cleanup',
    async (job: Job) => {
      switch (job.name) {
        case 'expired_vote_queues':
          await processExpiredVoteQueues(job);
          break;

        case 'old_notifications':
          await processOldNotifications(job);
          break;

        case 'failed_transcodes':
          await processFailedTranscodes(job);
          break;

        case 'expired_subscriptions':
          await processExpiredSubscriptions(job);
          break;

        case 'soft_deleted_users':
          await processSoftDeletedUsers(job);
          break;

        default:
          logger.warn('Cleanup worker: unknown job type', { jobName: job.name });
      }
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.debug('Cleanup job completed', { jobId: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Cleanup job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Cleanup worker error', { error: err.message });
  });

  logger.info('Cleanup worker started');

  return worker;
}

/**
 * Gracefully shuts down the cleanup worker.
 */
export async function stopCleanupWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Cleanup worker stopped');
  }
}
