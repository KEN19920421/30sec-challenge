import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';
import { generatePresignedUploadUrl } from '../../infrastructure/storage/s3.service';
import { transcodeQueue } from '../../jobs/queues';
import type { InitiateUploadInput } from './submission.validation';

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Initiates a video upload for a submission.
 *
 * Steps:
 *   1. Validate that the challenge is active and accepting submissions.
 *   2. Validate that the user has not already submitted to this challenge.
 *   3. Generate a presigned S3 upload URL.
 *   4. Create a submission record with status 'pending'.
 *
 * @returns The created submission record and the presigned upload URL.
 */
export async function initiateUpload(
  userId: string,
  data: InitiateUploadInput,
): Promise<{ submission: Record<string, unknown>; uploadUrl: string }> {
  const { challenge_id, filename, content_type, file_size, caption } = data;

  // 1. Verify challenge exists and is active
  const challenge = await db('challenges')
    .where({ id: challenge_id })
    .first();

  if (!challenge) {
    throw new NotFoundError('Challenge', challenge_id);
  }

  if (challenge.status !== 'active') {
    throw new ValidationError(
      'This challenge is not currently accepting submissions',
    );
  }

  const now = new Date();
  if (now > new Date(challenge.ends_at)) {
    throw new ValidationError(
      'The submission period for this challenge has ended',
    );
  }

  // 2. Check for existing submission
  const existingSubmission = await db('submissions')
    .where({ user_id: userId, challenge_id })
    .whereNull('deleted_at')
    .first();

  if (existingSubmission) {
    throw new ValidationError(
      'You have already submitted a video for this challenge',
    );
  }

  // 3. Generate S3 key and presigned URL
  const submissionId = uuidv4();
  const ext = filename.split('.').pop() || 'mp4';
  const s3Key = `submissions/${submissionId}/raw.${ext}`;

  const { url: uploadUrl } = await generatePresignedUploadUrl(
    s3Key,
    content_type,
    15 * 60, // 15 minutes
  );

  // 4. Create submission record
  const [submission] = await db('submissions')
    .insert({
      id: submissionId,
      user_id: userId,
      challenge_id,
      transcode_status: 'pending',
      video_key: s3Key,
      file_size_bytes: file_size,
      caption: caption || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  logger.info('Submission upload initiated', {
    submissionId,
    userId,
    challengeId: challenge_id,
  });

  return { submission, uploadUrl };
}

/**
 * Marks an upload as complete and enqueues the transcode job.
 *
 * @param userId        The authenticated user's ID.
 * @param submissionId  The submission to complete.
 */
export async function completeUpload(
  userId: string,
  submissionId: string,
): Promise<Record<string, unknown>> {
  const submission = await db('submissions')
    .where({ id: submissionId })
    .first();

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  if (submission.user_id !== userId) {
    throw new ForbiddenError('You can only complete your own uploads');
  }

  if (submission.transcode_status !== 'pending') {
    throw new ValidationError(
      `Cannot complete upload for submission with transcode_status '${submission.transcode_status}'`,
    );
  }

  // Update transcode_status to 'processing'
  const [updated] = await db('submissions')
    .where({ id: submissionId })
    .update({
      transcode_status: 'processing',
      updated_at: db.fn.now(),
    })
    .returning('*');

  // Enqueue transcode job
  await transcodeQueue.add(
    'transcode-video',
    {
      submissionId,
      videoKey: submission.video_key,
    },
    {
      jobId: `transcode-${submissionId}`,
    },
  );

  logger.info('Upload completed and transcode job enqueued', {
    submissionId,
    videoKey: submission.video_key,
  });

  return updated;
}

/**
 * Retrieves a single submission by ID, including user info.
 *
 * @throws NotFoundError if the submission does not exist or is deleted.
 */
export async function getById(
  id: string,
): Promise<Record<string, unknown>> {
  const submission = await db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .where('submissions.id', id)
    .whereNull('submissions.deleted_at')
    .first();

  if (!submission) {
    throw new NotFoundError('Submission', id);
  }

  return submission;
}

/**
 * Paginated submissions for a specific challenge.
 */
export async function getByChallenge(
  challengeId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  const baseQuery = db('submissions')
    .where('challenge_id', challengeId)
    .where('transcode_status', 'completed')
    .where('moderation_status', 'approved')
    .whereNull('deleted_at');

  const [{ count }] = await baseQuery.clone().count('id as count');
  const total = Number(count);

  const data = await db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .where('submissions.challenge_id', challengeId)
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at')
    .orderBy(
      `submissions.${pagination.sort_by || 'created_at'}`,
      pagination.sort_order || 'desc',
    )
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Paginated submissions for a specific user.
 */
export async function getByUser(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  const baseQuery = db('submissions')
    .where('user_id', userId)
    .whereNull('deleted_at');

  const [{ count }] = await baseQuery.clone().count('id as count');
  const total = Number(count);

  const data = await db('submissions')
    .select(
      'submissions.*',
      'challenges.title as challenge_title',
      'challenges.category as challenge_category',
    )
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .where('submissions.user_id', userId)
    .whereNull('submissions.deleted_at')
    .orderBy(
      `submissions.${pagination.sort_by || 'created_at'}`,
      pagination.sort_order || 'desc',
    )
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Soft-deletes a submission.
 *
 * Only the submission owner or an admin can delete a submission.
 *
 * @param userId        The authenticated user's ID.
 * @param submissionId  The submission to delete.
 * @param userRole      The authenticated user's role.
 */
export async function deleteSubmission(
  userId: string,
  submissionId: string,
  userRole?: string,
): Promise<void> {
  const submission = await db('submissions')
    .where({ id: submissionId })
    .whereNull('deleted_at')
    .first();

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  const isOwner = submission.user_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You can only delete your own submissions');
  }

  await db('submissions')
    .where({ id: submissionId })
    .update({
      deleted_at: new Date(),
      updated_at: db.fn.now(),
    });

  logger.info('Submission deleted', {
    submissionId,
    deletedBy: userId,
    wasOwner: isOwner,
  });
}
