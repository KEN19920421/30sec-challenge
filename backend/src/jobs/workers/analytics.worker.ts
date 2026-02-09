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

interface DailyStatsData {
  date: string; // ISO date string, e.g. '2025-01-15' (maps to stat_date column)
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

/**
 * Aggregates daily statistics into the daily_stats table.
 *
 * Metrics computed:
 *   - new_users          : Users created on this date
 *   - active_users       : Users who submitted, voted, or logged in on this date
 *   - total_submissions  : Submissions created on this date
 *   - total_votes        : Votes cast on this date
 *   - total_gifts_sent   : Gifts sent on this date
 *   - total_coins_purchased: Number of coin purchase transactions on this date
 *   - total_revenue_usd  : Total revenue (subscriptions + coins) on this date
 *   - new_subscriptions  : New subscriptions created on this date
 *   - churned_subscriptions: Subscriptions that expired on this date
 *   - ad_impressions     : Ad impressions served on this date
 *   - ad_revenue_usd     : Estimated revenue from ad impressions
 */
async function processDailyStats(job: Job<DailyStatsData>): Promise<void> {
  const { date } = job.data;

  logger.debug('Aggregating daily stats', { date, jobId: job.id });

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // Run all count queries in parallel
  const [
    newUsersResult,
    activeSubmittersResult,
    activeVotersResult,
    totalSubmissionsResult,
    totalVotesResult,
    totalGiftsSentResult,
    totalCoinsPurchasedResult,
    subscriptionRevenueResult,
    coinRevenueResult,
    newSubscriptionsResult,
    churnedSubscriptionsResult,
    adImpressionsResult,
  ] = await Promise.all([
    // New users
    db('users')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Active submitters
    db('submissions')
      .whereBetween('created_at', [dayStart, dayEnd])
      .countDistinct('user_id as count'),

    // Active voters
    db('votes')
      .whereBetween('created_at', [dayStart, dayEnd])
      .countDistinct('user_id as count'),

    // Total submissions
    db('submissions')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Total votes
    db('votes')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Total gifts sent
    db('gifts')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Total coins purchased
    db('coin_transactions')
      .where('type', 'purchase')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Subscription revenue
    db('subscription_payments')
      .where('status', 'completed')
      .whereBetween('created_at', [dayStart, dayEnd])
      .sum('amount as total'),

    // Coin purchase revenue
    db('coin_transactions')
      .where('type', 'purchase')
      .whereBetween('created_at', [dayStart, dayEnd])
      .sum('amount as total'),

    // New subscriptions
    db('subscriptions')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),

    // Churned subscriptions (expired on this date)
    db('subscriptions')
      .where('status', 'expired')
      .whereBetween('updated_at', [dayStart, dayEnd])
      .count('id as count'),

    // Ad impressions
    db('ad_impressions')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as count'),
  ]);

  const newUsers = Number(newUsersResult[0].count);
  const activeSubmitters = Number(activeSubmittersResult[0].count);
  const activeVoters = Number(activeVotersResult[0].count);
  const activeUsers = Math.max(activeSubmitters, activeVoters); // Approximation; deduplicated via UNION if needed
  const totalSubmissions = Number(totalSubmissionsResult[0].count);
  const totalVotes = Number(totalVotesResult[0].count);
  const totalGiftsSent = Number(totalGiftsSentResult[0].count);
  const totalCoinsPurchased = Number(totalCoinsPurchasedResult[0].count);
  const subscriptionRevenue = Number(subscriptionRevenueResult[0].total) || 0;
  const coinRevenue = Number(coinRevenueResult[0].total) || 0;
  const totalRevenueUsd = subscriptionRevenue + coinRevenue;
  const newSubscriptions = Number(newSubscriptionsResult[0].count);
  const churnedSubscriptions = Number(churnedSubscriptionsResult[0].count);
  const adImpressions = Number(adImpressionsResult[0].count);

  // Estimate ad revenue using a configurable eCPM (effective cost per mille)
  const eCPM = Number(process.env.AD_ECPM) || 5.0; // Default $5 eCPM
  const adRevenueUsd = (adImpressions / 1000) * eCPM;

  // Upsert into daily_stats
  await db('daily_stats')
    .insert({
      stat_date: date,
      new_users: newUsers,
      active_users: activeUsers,
      total_submissions: totalSubmissions,
      total_votes: totalVotes,
      total_gifts_sent: totalGiftsSent,
      total_coins_purchased: totalCoinsPurchased,
      total_revenue_usd: totalRevenueUsd,
      new_subscriptions: newSubscriptions,
      churned_subscriptions: churnedSubscriptions,
      ad_impressions: adImpressions,
      ad_revenue_usd: adRevenueUsd,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .onConflict('stat_date')
    .merge({
      new_users: newUsers,
      active_users: activeUsers,
      total_submissions: totalSubmissions,
      total_votes: totalVotes,
      total_gifts_sent: totalGiftsSent,
      total_coins_purchased: totalCoinsPurchased,
      total_revenue_usd: totalRevenueUsd,
      new_subscriptions: newSubscriptions,
      churned_subscriptions: churnedSubscriptions,
      ad_impressions: adImpressions,
      ad_revenue_usd: adRevenueUsd,
      updated_at: db.fn.now(),
    });

  logger.info('Daily stats aggregated', {
    date,
    newUsers,
    activeUsers,
    totalSubmissions,
    totalVotes,
    totalGiftsSent,
    totalCoinsPurchased,
    totalRevenueUsd,
    newSubscriptions,
    churnedSubscriptions,
    adImpressions,
    adRevenueUsd,
  });
}

/**
 * Refreshes materialized views used for leaderboard and trending data.
 */
async function processRefreshViews(job: Job): Promise<void> {
  logger.debug('Refreshing materialized views', { jobId: job.id });

  const views = ['mv_challenge_rankings', 'mv_trending_submissions'];

  for (const view of views) {
    try {
      await db.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
      logger.info('Materialized view refreshed', { view });
    } catch (err) {
      // If CONCURRENTLY fails (e.g. no unique index), fall back to non-concurrent
      try {
        await db.raw(`REFRESH MATERIALIZED VIEW ${view}`);
        logger.info('Materialized view refreshed (non-concurrent fallback)', { view });
      } catch (fallbackErr) {
        logger.error('Failed to refresh materialized view', {
          view,
          error: (fallbackErr as Error).message,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

/**
 * Starts the analytics worker. Safe to call multiple times.
 */
export function startAnalyticsWorker(): Worker {
  if (worker) {
    logger.warn('Analytics worker is already running');
    return worker;
  }

  worker = new Worker(
    'analytics',
    async (job: Job) => {
      switch (job.name) {
        case 'daily_stats':
          await processDailyStats(job as Job<DailyStatsData>);
          break;

        case 'refresh_views':
          await processRefreshViews(job);
          break;

        default:
          logger.warn('Analytics worker: unknown job type', { jobName: job.name });
      }
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.debug('Analytics job completed', { jobId: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Analytics job failed', {
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Analytics worker error', { error: err.message });
  });

  logger.info('Analytics worker started');

  return worker;
}

/**
 * Gracefully shuts down the analytics worker.
 */
export async function stopAnalyticsWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Analytics worker stopped');
  }
}
