import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { generateThumbnails } from '../../infrastructure/video/thumbnail.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThumbnailJobData {
  submissionId: string;
  videoKey: string;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let thumbnailWorker: Worker | null = null;

/**
 * Starts the thumbnail generation worker that listens on the `thumbnail` queue.
 *
 * For each job the worker:
 *   1. Calls `generateThumbnails()` to produce multiple thumbnail options.
 *   2. Updates the submission record with the chosen default thumbnail URL.
 *   3. On failure, logs the error (thumbnail failure is non-critical).
 */
export function startThumbnailWorker(): Worker {
  if (thumbnailWorker) {
    logger.warn('Thumbnail worker is already running');
    return thumbnailWorker;
  }

  thumbnailWorker = new Worker<ThumbnailJobData>(
    'thumbnail',
    async (job: Job<ThumbnailJobData>) => {
      const { submissionId, videoKey } = job.data;

      logger.info('Thumbnail job started', {
        jobId: job.id,
        submissionId,
        videoKey,
      });

      const results = await generateThumbnails(submissionId, videoKey);

      logger.info('Thumbnail job completed', {
        jobId: job.id,
        submissionId,
        thumbnailCount: results.length,
      });

      return { thumbnailCount: results.length, thumbnails: results };
    },
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.THUMBNAIL_CONCURRENCY) || 3,
      limiter: {
        max: Number(process.env.THUMBNAIL_RATE_MAX) || 10,
        duration: 60_000,
      },
    },
  );

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  thumbnailWorker.on('completed', (job: Job<ThumbnailJobData>) => {
    logger.info('Thumbnail worker: job completed', {
      jobId: job.id,
      submissionId: job.data.submissionId,
    });
  });

  thumbnailWorker.on('failed', async (job: Job<ThumbnailJobData> | undefined, error: Error) => {
    if (!job) {
      logger.error('Thumbnail worker: job failed (no job reference)', {
        error: error.message,
      });
      return;
    }

    logger.error('Thumbnail worker: job failed', {
      jobId: job.id,
      submissionId: job.data.submissionId,
      attempt: job.attemptsMade,
      error: error.message,
    });

    // Thumbnail generation failure is non-critical.
    // On final failure, log a warning but do not change submission status.
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3);

    if (isFinalAttempt) {
      logger.warn('Thumbnail generation permanently failed for submission', {
        submissionId: job.data.submissionId,
        error: error.message,
      });
    }
  });

  thumbnailWorker.on('error', (error: Error) => {
    logger.error('Thumbnail worker error', { error: error.message });
  });

  logger.info('Thumbnail worker started', {
    queue: 'thumbnail',
    concurrency: Number(process.env.THUMBNAIL_CONCURRENCY) || 3,
  });

  return thumbnailWorker;
}

/**
 * Gracefully stops the thumbnail worker.
 */
export async function stopThumbnailWorker(): Promise<void> {
  if (thumbnailWorker) {
    await thumbnailWorker.close();
    thumbnailWorker = null;
    logger.info('Thumbnail worker stopped');
  }
}
