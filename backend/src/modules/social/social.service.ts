import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors';
import {
  PaginationParams,
  PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';
import * as notificationService from '../notification/notification.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FollowUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_following_back?: boolean;
  followed_at: Date;
}

export interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: Date;
}

export interface ReportResult {
  id: string;
  status: string;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILE_CACHE_PREFIX = 'user_profile:';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function invalidateProfileCache(userId: string): Promise<void> {
  await redis.del(`${PROFILE_CACHE_PREFIX}${userId}`);
}

async function assertUserExists(userId: string): Promise<void> {
  const user = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id');

  if (!user) {
    throw new NotFoundError('User', userId);
  }
}

async function isBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const block = await db('blocked_users')
    .where({ blocker_id: blockerId, blocked_id: blockedId })
    .first('id');

  return !!block;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Creates a follow relationship between two users.
 * Increments follower/following counts and sends a notification.
 */
export async function follow(
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'You cannot follow yourself' },
    ]);
  }

  await assertUserExists(followingId);

  // Check if either user has blocked the other
  const [blockedByTarget, blockedByFollower] = await Promise.all([
    isBlocked(followingId, followerId),
    isBlocked(followerId, followingId),
  ]);

  if (blockedByTarget || blockedByFollower) {
    throw new ForbiddenError('Unable to follow this user');
  }

  // Check if already following
  const existing = await db('follows')
    .where({ follower_id: followerId, following_id: followingId })
    .first('id');

  if (existing) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'You are already following this user' },
    ]);
  }

  await db.transaction(async (trx) => {
    await trx('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    await trx('users')
      .where('id', followerId)
      .increment('following_count', 1);

    await trx('users')
      .where('id', followingId)
      .increment('follower_count', 1);
  });

  // Invalidate both users' profile caches
  await Promise.all([
    invalidateProfileCache(followerId),
    invalidateProfileCache(followingId),
  ]);

  // Send follow notification (fire-and-forget)
  notificationService
    .create(
      followingId,
      'follow',
      'New Follower',
      'Someone started following you',
      { follower_id: followerId },
    )
    .catch((err) => {
      logger.error('Failed to create follow notification', { error: err });
    });

  logger.info('User followed', { followerId, followingId });
}

/**
 * Removes a follow relationship between two users.
 * Decrements follower/following counts.
 */
export async function unfollow(
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'You cannot unfollow yourself' },
    ]);
  }

  const existing = await db('follows')
    .where({ follower_id: followerId, following_id: followingId })
    .first('id');

  if (!existing) {
    throw new NotFoundError('Follow relationship');
  }

  await db.transaction(async (trx) => {
    await trx('follows')
      .where({ follower_id: followerId, following_id: followingId })
      .delete();

    await trx('users')
      .where('id', followerId)
      .where('following_count', '>', 0)
      .decrement('following_count', 1);

    await trx('users')
      .where('id', followingId)
      .where('follower_count', '>', 0)
      .decrement('follower_count', 1);
  });

  await Promise.all([
    invalidateProfileCache(followerId),
    invalidateProfileCache(followingId),
  ]);

  logger.info('User unfollowed', { followerId, followingId });
}

/**
 * Returns a paginated list of followers for a user.
 * Includes a `is_following_back` flag indicating whether the user follows them back.
 */
export async function getFollowers(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<FollowUser>> {
  await assertUserExists(userId);

  const offset = paginationToOffset(pagination);

  const baseQuery = db('follows')
    .where('follows.following_id', userId)
    .join('users', 'follows.follower_id', 'users.id');

  const [{ count }] = await baseQuery.clone().count('* as count');
  const total = Number(count);

  const rows = await baseQuery
    .clone()
    .select(
      'users.id',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'follows.created_at as followed_at',
    )
    .orderBy('follows.created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  // Determine follow-back status in a single query
  if (rows.length > 0) {
    const followerIds = rows.map((r: any) => r.id);
    const followBacks = await db('follows')
      .where('follower_id', userId)
      .whereIn('following_id', followerIds)
      .select('following_id');

    const followBackSet = new Set(followBacks.map((f: any) => f.following_id));

    for (const row of rows) {
      (row as any).is_following_back = followBackSet.has(row.id);
    }
  }

  return buildPaginatedResult(rows as FollowUser[], total, pagination);
}

/**
 * Returns a paginated list of users that a given user is following.
 */
export async function getFollowing(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<FollowUser>> {
  await assertUserExists(userId);

  const offset = paginationToOffset(pagination);

  const baseQuery = db('follows')
    .where('follows.follower_id', userId)
    .join('users', 'follows.following_id', 'users.id');

  const [{ count }] = await baseQuery.clone().count('* as count');
  const total = Number(count);

  const rows = await baseQuery
    .clone()
    .select(
      'users.id',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'follows.created_at as followed_at',
    )
    .orderBy('follows.created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(rows as FollowUser[], total, pagination);
}

/**
 * Checks whether `followerId` is following `followingId`.
 */
export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follow = await db('follows')
    .where({ follower_id: followerId, following_id: followingId })
    .first('id');

  return !!follow;
}

/**
 * Blocks a user and automatically removes any follow relationships
 * in both directions.
 */
export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  if (blockerId === blockedId) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'You cannot block yourself' },
    ]);
  }

  await assertUserExists(blockedId);

  // Check if already blocked
  const existing = await db('blocked_users')
    .where({ blocker_id: blockerId, blocked_id: blockedId })
    .first('id');

  if (existing) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'User is already blocked' },
    ]);
  }

  await db.transaction(async (trx) => {
    // Create block record
    await trx('blocked_users').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    // Remove follows in both directions and adjust counts
    const blockerFollowsBlocked = await trx('follows')
      .where({ follower_id: blockerId, following_id: blockedId })
      .delete();

    const blockedFollowsBlocker = await trx('follows')
      .where({ follower_id: blockedId, following_id: blockerId })
      .delete();

    // Decrement counts if follows existed
    if (blockerFollowsBlocked > 0) {
      await trx('users')
        .where('id', blockerId)
        .where('following_count', '>', 0)
        .decrement('following_count', 1);

      await trx('users')
        .where('id', blockedId)
        .where('follower_count', '>', 0)
        .decrement('follower_count', 1);
    }

    if (blockedFollowsBlocker > 0) {
      await trx('users')
        .where('id', blockedId)
        .where('following_count', '>', 0)
        .decrement('following_count', 1);

      await trx('users')
        .where('id', blockerId)
        .where('follower_count', '>', 0)
        .decrement('follower_count', 1);
    }
  });

  await Promise.all([
    invalidateProfileCache(blockerId),
    invalidateProfileCache(blockedId),
  ]);

  logger.info('User blocked', { blockerId, blockedId });
}

/**
 * Removes a block on a user.
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const deleted = await db('blocked_users')
    .where({ blocker_id: blockerId, blocked_id: blockedId })
    .delete();

  if (!deleted) {
    throw new NotFoundError('Block relationship');
  }

  logger.info('User unblocked', { blockerId, blockedId });
}

/**
 * Returns a list of all users blocked by a given user.
 */
export async function getBlockedUsers(
  userId: string,
): Promise<BlockedUser[]> {
  const rows = await db('blocked_users')
    .where('blocked_users.blocker_id', userId)
    .join('users', 'blocked_users.blocked_id', 'users.id')
    .select(
      'users.id',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'blocked_users.created_at as blocked_at',
    )
    .orderBy('blocked_users.created_at', 'desc');

  return rows as BlockedUser[];
}

/**
 * Creates a report against a user.
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  description?: string,
): Promise<ReportResult> {
  if (reporterId === reportedUserId) {
    throw new ValidationError('Validation failed', [
      { field: 'userId', message: 'You cannot report yourself' },
    ]);
  }

  await assertUserExists(reportedUserId);

  const [report] = await db('reports')
    .insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      description: description || null,
      status: 'pending',
    })
    .returning(['id', 'status', 'created_at']);

  logger.info('User reported', { reporterId, reportedUserId, reason });

  return report as ReportResult;
}

/**
 * Creates a report against a submission.
 */
export async function reportSubmission(
  reporterId: string,
  submissionId: string,
  reason: string,
  description?: string,
): Promise<ReportResult> {
  const submission = await db('submissions')
    .where('id', submissionId)
    .first('id', 'user_id');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  if (reporterId === submission.user_id) {
    throw new ValidationError('Validation failed', [
      { field: 'submissionId', message: 'You cannot report your own submission' },
    ]);
  }

  const [report] = await db('reports')
    .insert({
      reporter_id: reporterId,
      reported_user_id: submission.user_id,
      submission_id: submissionId,
      reason,
      description: description || null,
      status: 'pending',
    })
    .returning(['id', 'status', 'created_at']);

  logger.info('Submission reported', { reporterId, submissionId, reason });

  return report as ReportResult;
}
