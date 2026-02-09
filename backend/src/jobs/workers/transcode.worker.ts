import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import db from '../../config/database';
import { logger } from '../../config/logger';
import { processVideo } from '../../infrastructure/video/transcode.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscodeJobData {
  submissionId: string;
  videoKey: string;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let transcodeWorker: Worker | null = null;

/**
 * Starts the transcode worker that listens on the `transcode` queue.
 *
 * For each job the worker:
 *   1. Calls `processVideo()` to download, validate, transcode, and upload.
 *   2. On success -- the submission status is set to `ready` inside processVideo.
 *   3. On failure -- the submission status is set to `failed`.
 */
export function startTranscodeWorker(): Worker {
  if (transcodeWorker) {
    logger.warn('Transcode worker is already running');
    return transcodeWorker;
  }

  transcodeWorker = new Worker<TranscodeJobData>(
    'transcode',
    async (job: Job<TranscodeJobData>) => {
      const { submissionId, videoKey } = job.data;

      logger.info('Transcode job started', {
        jobId: job.id,
        submissionId,
        videoKey,
        attempt: job.attemptsMade + 1,
      });

      await processVideo(submissionId, videoKey);

      logger.info('Transcode job completed', {
        jobId: job.id,
        submissionId,
      });
    },
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.TRANSCODE_CONCURRENCY) || 2,
      limiter: {
        max: Number(process.env.TRANSCODE_RATE_MAX) || 5,
        duration: 60_000, // per minute
      },
    },
  );

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  transcodeWorker.on('completed', (job: Job<TranscodeJobData>) => {
    logger.info('Transcode worker: job completed', {
      jobId: job.id,
      submissionId: job.data.submissionId,
    });
  });

  transcodeWorker.on('failed', async (job: Job<TranscodeJobData> | undefined, error: Error) => {
    if (!job) {
      logger.error('Transcode worker: job failed (no job reference)', {
        error: error.message,
      });
      return;
    }

    logger.error('Transcode worker: job failed', {
      jobId: job.id,
      submissionId: job.data.submissionId,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      error: error.message,
      stack: error.stack,
    });

    // On final failure, ensure the submission is marked as failed
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3);

    if (isFinalAttempt) {
      try {
        await db('submissions')
          .where({ id: job.data.submissionId })
          .update({
            transcode_status: 'failed',
            moderation_reason: `Transcode failed after ${job.attemptsMade} attempts: ${error.message}`,
            updated_at: db.fn.now(),
          });

        logger.warn('Submission marked as permanently failed', {
          submissionId: job.data.submissionId,
        });
      } catch (dbError) {
        logger.error('Failed to update submission status after final failure', {
          submissionId: job.data.submissionId,
          error: (dbError as Error).message,
        });
      }
    }
  });

  transcodeWorker.on('error', (error: Error) => {
    logger.error('Transcode worker error', { error: error.message });
  });

  logger.info('Transcode worker started', {
    queue: 'transcode',
    concurrency: Number(process.env.TRANSCODE_CONCURRENCY) || 2,
  });

  return transcodeWorker;
}

/**
 * Gracefully stops the transcode worker.
 */
export async function stopTranscodeWorker(): Promise<void> {
  if (transcodeWorker) {
    await transcodeWorker.close();
    transcodeWorker = null;
    logger.info('Transcode worker stopped');
  }
}
