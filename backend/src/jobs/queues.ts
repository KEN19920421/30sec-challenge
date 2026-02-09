import { Queue, JobsOptions } from 'bullmq';
import { logger } from '../config/logger';

// ---------------------------------------------------------------------------
// Redis connection config for BullMQ
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
// Queue instances
// ---------------------------------------------------------------------------

export const transcodeQueue = new Queue('transcode', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const thumbnailQueue = new Queue('thumbnail', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const leaderboardQueue = new Queue('leaderboard', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});

export const notificationQueue = new Queue('notification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 5000 },
  },
});

export const achievementQueue = new Queue('achievement', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 3000 },
  },
});

export const cleanupQueue = new Queue('cleanup', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export const analyticsQueue = new Queue('analytics', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

// ---------------------------------------------------------------------------
// Queue map for dynamic access
// ---------------------------------------------------------------------------

const queues: Record<string, Queue> = {
  transcode: transcodeQueue,
  thumbnail: thumbnailQueue,
  leaderboard: leaderboardQueue,
  notification: notificationQueue,
  achievement: achievementQueue,
  cleanup: cleanupQueue,
  analytics: analyticsQueue,
};

// ---------------------------------------------------------------------------
// Helper: add a job to any queue by name
// ---------------------------------------------------------------------------

/**
 * Adds a job to the specified queue.
 *
 * @param queueName  One of the registered queue names.
 * @param jobType    The job type / name (used for routing inside the worker).
 * @param data       Arbitrary payload for the job.
 * @param options    Optional BullMQ job options override.
 * @returns The created job instance.
 *
 * @throws Error if the queue name is not registered.
 */
export async function addJob(
  queueName: string,
  jobType: string,
  data: Record<string, unknown>,
  options?: JobsOptions,
) {
  const queue = queues[queueName];

  if (!queue) {
    throw new Error(`Unknown queue: '${queueName}'. Registered queues: ${Object.keys(queues).join(', ')}`);
  }

  const job = await queue.add(jobType, data, options);

  logger.debug('Job enqueued', {
    queue: queueName,
    jobType,
    jobId: job.id,
  });

  return job;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Closes all queue connections. Call during graceful shutdown.
 */
export async function closeAllQueues(): Promise<void> {
  const names = Object.keys(queues);

  await Promise.allSettled(
    names.map(async (name) => {
      try {
        await queues[name].close();
        logger.info(`Queue '${name}' closed`);
      } catch (err) {
        logger.error(`Failed to close queue '${name}'`, { error: (err as Error).message });
      }
    }),
  );
}
