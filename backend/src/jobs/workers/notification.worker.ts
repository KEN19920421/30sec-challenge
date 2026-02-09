import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import * as notificationService from '../../modules/notification/notification.service';
import * as pushService from '../../modules/notification/push.service';

// ---------------------------------------------------------------------------
// Job types
// ---------------------------------------------------------------------------

interface SendPushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface BulkNotifyJobData {
  userIds: string[];
  type: notificationService.NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  pushData?: Record<string, string>;
}

type NotificationJobData = SendPushJobData | BulkNotifyJobData;

// ---------------------------------------------------------------------------
// Queue name
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'notification';

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

/**
 * Handles `send_push` jobs: sends a push notification to a single user.
 */
async function handleSendPush(job: Job<SendPushJobData>): Promise<void> {
  const { userId, title, body, data } = job.data;

  logger.info('Processing send_push job', {
    jobId: job.id,
    userId,
  });

  await pushService.sendPush(userId, title, body, data);
}

/**
 * Handles `bulk_notify` jobs: creates in-app notifications and sends
 * push notifications to multiple users (e.g., challenge start/end events).
 */
async function handleBulkNotify(job: Job<BulkNotifyJobData>): Promise<void> {
  const { userIds, type, title, body, data, pushData } = job.data;

  logger.info('Processing bulk_notify job', {
    jobId: job.id,
    userCount: userIds.length,
    type,
  });

  // Create in-app notifications for all users in parallel (batched)
  const BATCH_SIZE = 100;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map((userId) =>
        notificationService
          .create(userId, type, title, body, data)
          .catch((err) => {
            logger.error('Failed to create notification for user', {
              userId,
              error: err,
            });
          }),
      ),
    );
  }

  // Send push notifications to all users
  await pushService.sendPushToMany(
    userIds,
    title,
    body,
    pushData || (data as Record<string, string> | undefined),
  );

  logger.info('Bulk notify job completed', {
    jobId: job.id,
    userCount: userIds.length,
  });
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

/**
 * Creates and returns a BullMQ worker for the notification queue.
 *
 * Supports two job types:
 * - `send_push`   - Send a push notification to a single user.
 * - `bulk_notify` - Create notifications and send push to many users.
 */
export function createNotificationWorker(): Worker {
  const connection = createRedisConnection();

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      switch (job.name) {
        case 'send_push':
          await handleSendPush(job as Job<SendPushJobData>);
          break;

        case 'bulk_notify':
          await handleBulkNotify(job as Job<BulkNotifyJobData>);
          break;

        default:
          logger.warn('Unknown notification job type', {
            jobId: job.id,
            jobName: job.name,
          });
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 1000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60, // 24 hours
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 60 * 60, // 7 days
      },
    },
  );

  worker.on('completed', (job) => {
    logger.debug('Notification job completed', {
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Notification job failed', {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      stack: err.stack,
    });
  });

  worker.on('error', (err) => {
    logger.error('Notification worker error', { error: err.message });
  });

  logger.info(`Notification worker started on queue "${QUEUE_NAME}"`);

  return worker;
}

export default createNotificationWorker;
