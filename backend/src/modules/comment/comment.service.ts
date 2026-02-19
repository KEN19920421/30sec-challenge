import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import {
  parsePaginationParams,
  paginationToOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommentRow {
  id: string;
  user_id: string;
  submission_id: string;
  content: string;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface CommentWithUser extends CommentRow {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  reply_count?: number;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Returns paginated top-level comments for a submission.
 */
export async function getSubmissionComments(
  submissionId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<CommentWithUser>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('comments')
    .where('submission_id', submissionId)
    .whereNull('parent_id')
    .whereNull('deleted_at')
    .count('id as count');

  const comments = await db('comments as c')
    .where('c.submission_id', submissionId)
    .whereNull('c.parent_id')
    .whereNull('c.deleted_at')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .orderBy('c.created_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select(
      'c.*',
      'u.username',
      'u.display_name',
      'u.avatar_url',
      db.raw(
        `(SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id AND r.deleted_at IS NULL)::int as reply_count`,
      ),
    );

  return buildPaginatedResult(comments, parseInt(count as string, 10), pagination);
}

/**
 * Returns paginated replies for a given parent comment.
 */
export async function getCommentReplies(
  commentId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<CommentWithUser>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  // Verify parent comment exists
  const parentComment = await db('comments')
    .where('id', commentId)
    .whereNull('deleted_at')
    .first('id');

  if (!parentComment) {
    throw new NotFoundError('Comment', commentId);
  }

  const [{ count }] = await db('comments')
    .where('parent_id', commentId)
    .whereNull('deleted_at')
    .count('id as count');

  const replies = await db('comments as c')
    .where('c.parent_id', commentId)
    .whereNull('c.deleted_at')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .orderBy('c.created_at', 'asc')
    .offset(offset)
    .limit(pagination.limit)
    .select(
      'c.*',
      'u.username',
      'u.display_name',
      'u.avatar_url',
    );

  return buildPaginatedResult(replies, parseInt(count as string, 10), pagination);
}

/**
 * Creates a new comment (or reply) on a submission.
 */
export async function createComment(
  userId: string,
  data: { submission_id: string; content: string; parent_id?: string },
): Promise<CommentWithUser> {
  // Verify submission exists and is not deleted
  const submission = await db('submissions')
    .where('id', data.submission_id)
    .whereNull('deleted_at')
    .first('id', 'user_id');

  if (!submission) {
    throw new NotFoundError('Submission', data.submission_id);
  }

  // If parent_id is provided, verify parent comment exists and belongs to the same submission
  if (data.parent_id) {
    const parentComment = await db('comments')
      .where('id', data.parent_id)
      .whereNull('deleted_at')
      .first('id', 'submission_id', 'user_id');

    if (!parentComment) {
      throw new NotFoundError('Comment', data.parent_id);
    }

    if (parentComment.submission_id !== data.submission_id) {
      throw new ForbiddenError('Parent comment does not belong to the same submission');
    }
  }

  // Insert the comment
  const [comment] = await db('comments')
    .insert({
      user_id: userId,
      submission_id: data.submission_id,
      content: data.content,
      parent_id: data.parent_id || null,
    })
    .returning('*');

  // Create notification for the submission owner (if commenter is not the owner)
  if (submission.user_id !== userId) {
    await db('notifications').insert({
      user_id: submission.user_id,
      type: 'comment_received',
      title: 'New comment on your submission',
      body: data.content.length > 100 ? `${data.content.substring(0, 100)}...` : data.content,
      data: JSON.stringify({
        comment_id: comment.id,
        submission_id: data.submission_id,
        commenter_id: userId,
      }),
    });
  }

  // If it's a reply, also notify the parent comment author (if different from commenter and submission owner)
  if (data.parent_id) {
    const parentComment = await db('comments')
      .where('id', data.parent_id)
      .first('user_id');

    if (parentComment && parentComment.user_id !== userId && parentComment.user_id !== submission.user_id) {
      await db('notifications').insert({
        user_id: parentComment.user_id,
        type: 'comment_received',
        title: 'New reply to your comment',
        body: data.content.length > 100 ? `${data.content.substring(0, 100)}...` : data.content,
        data: JSON.stringify({
          comment_id: comment.id,
          parent_comment_id: data.parent_id,
          submission_id: data.submission_id,
          commenter_id: userId,
        }),
      });
    }
  }

  // Fetch the created comment with user info
  const commentWithUser = await db('comments as c')
    .where('c.id', comment.id)
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .select(
      'c.*',
      'u.username',
      'u.display_name',
      'u.avatar_url',
    )
    .first();

  logger.info('Comment created', {
    commentId: comment.id,
    userId,
    submissionId: data.submission_id,
    parentId: data.parent_id || null,
  });

  return commentWithUser;
}

/**
 * Soft-deletes a comment (sets deleted_at).
 */
export async function deleteComment(
  userId: string,
  commentId: string,
): Promise<void> {
  const comment = await db('comments')
    .where('id', commentId)
    .whereNull('deleted_at')
    .first('id', 'user_id');

  if (!comment) {
    throw new NotFoundError('Comment', commentId);
  }

  if (comment.user_id !== userId) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  await db('comments')
    .where('id', commentId)
    .update({ deleted_at: db.fn.now() });

  logger.info('Comment deleted', { commentId, userId });
}
