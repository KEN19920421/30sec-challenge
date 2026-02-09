import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { computeLeaderboard } from '../../modules/leaderboard/leaderboard.service';
import { db } from '../../config/database';

// ---------------------------------------------------------------------------
// Job types
// ---------------------------------------------------------------------------

interface ComputeJobData {
  type: 'compute';
  challengeId: string;
}

interface SnapshotJobData {
  type: 'snapshot';
  challengeId?: string; // If omitted, snapshot all active challenges
}

type LeaderboardJobData = ComputeJobData | SnapshotJobData;

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'leaderboard';

/**
 * BullMQ worker that processes leaderboard computation and snapshot jobs.
 *
 * Job types:
 * - `compute`: Recomputes the full leaderboard for a single challenge.
 *   Triggered after significant vote activity or on a periodic schedule.
 *
 * - `snapshot`: Persists a point-in-time leaderboard snapshot to the database.
 *   Useful for historical tracking and analytics. When no challengeId is
 *   provided, snapshots all challenges with 'active' or 'voting' status.
 */
const worker = new Worker<LeaderboardJobData>(
  QUEUE_NAME,
  async (job: Job<LeaderboardJobData>) => {
    const { type } = job.data;

    switch (type) {
      case 'compute': {
        const { challengeId } = job.data as ComputeJobData;

        logger.info('Leaderboard compute job started', {
          jobId: job.id,
          challengeId,
        });

        await computeLeaderboard(challengeId);

        logger.info('Leaderboard compute job completed', {
          jobId: job.id,
          challengeId,
        });
        break;
      }

      case 'snapshot': {
        const { challengeId } = job.data as SnapshotJobData;

        if (challengeId) {
          // Snapshot a single challenge
          logger.info('Leaderboard snapshot job started (single)', {
            jobId: job.id,
            challengeId,
          });

          await computeLeaderboard(challengeId);
        } else {
          // Snapshot all active/voting challenges
          logger.info('Leaderboard snapshot job started (all active)', {
            jobId: job.id,
          });

          const challenges = await db('challenges')
            .whereIn('status', ['active', 'voting'])
            .select('id');

          for (const challenge of challenges) {
            try {
              await computeLeaderboard(challenge.id);
            } catch (err) {
              logger.error('Failed to compute leaderboard for challenge', {
                challengeId: challenge.id,
                error: err instanceof Error ? err.message : err,
              });
              // Continue with other challenges
            }
          }

          logger.info('Leaderboard snapshot job completed (all active)', {
            jobId: job.id,
            challengeCount: challenges.length,
          });
        }
        break;
      }

      default: {
        logger.warn('Unknown leaderboard job type', {
          jobId: job.id,
          type,
        });
      }
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60_000, // Max 10 jobs per minute
    },
    removeOnComplete: {
      age: 60 * 60 * 24, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
);

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

worker.on('completed', (job: Job<LeaderboardJobData>) => {
  logger.info('Leaderboard job completed', {
    jobId: job.id,
    type: job.data.type,
  });
});

worker.on('failed', (job: Job<LeaderboardJobData> | undefined, err: Error) => {
  logger.error('Leaderboard job failed', {
    jobId: job?.id,
    type: job?.data.type,
    error: err.message,
    stack: err.stack,
  });
});

worker.on('error', (err: Error) => {
  logger.error('Leaderboard worker error', {
    error: err.message,
  });
});

export { worker as leaderboardWorker };
export default worker;
