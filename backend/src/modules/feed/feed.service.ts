import db from '../../config/database';
import { ValidationError } from '../../shared/errors';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

/**
 * Returns a subquery of user IDs that the viewer has blocked or been blocked by.
 */
function blockedUserIds(viewerId: string) {
  return db('blocked_users')
    .where('blocker_id', viewerId)
    .select('blocked_id as uid')
    .union(function () {
      this.from('blocked_users')
        .where('blocked_id', viewerId)
        .select('blocker_id as uid');
    });
}

/**
 * Returns trending submissions sorted by wilson_score.
 * Only includes transcoded + approved submissions.
 * Optionally filters out blocked users' submissions.
 */
export async function getTrending(
  limit: number = 10,
  viewerId?: string,
): Promise<Record<string, unknown>[]> {
  let query = db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

  if (viewerId) {
    query = query.whereNotIn('submissions.user_id', blockedUserIds(viewerId));
  }

  return query
    .orderByRaw('(submissions.wilson_score + COALESCE(submissions.boost_score, 0)) DESC')
    .limit(limit);
}

/**
 * Returns a paginated "for-you" feed of submissions.
 * Supports optional category and search filters.
 * Optionally filters out blocked users' submissions.
 */
export async function getForYou(
  pagination: PaginationParams,
  options?: { category?: string; search?: string; viewerId?: string },
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);
  const viewerId = options?.viewerId;

  if (options?.search) {
    if (options.search.length > 500) {
      throw new ValidationError('Search query too long');
    }
  }

  let baseQuery = db('submissions')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

  if (viewerId) {
    baseQuery = baseQuery.whereNotIn('submissions.user_id', blockedUserIds(viewerId));
  }

  if (options?.category && options.category !== 'All') {
    baseQuery = baseQuery
      .leftJoin('challenges as c_filter', 'submissions.challenge_id', 'c_filter.id')
      .where('c_filter.category', options.category);
  }

  if (options?.search) {
    baseQuery = baseQuery.where(function () {
      this.where('submissions.caption', 'ilike', `%${options!.search}%`);
    });
  }

  const [{ count }] = await baseQuery.clone().count('submissions.id as count');
  const total = Number(count);

  let dataQuery = db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

  if (viewerId) {
    dataQuery = dataQuery.whereNotIn('submissions.user_id', blockedUserIds(viewerId));
  }

  if (options?.category && options.category !== 'All') {
    dataQuery = dataQuery
      .leftJoin('challenges as c_feed', 'submissions.challenge_id', 'c_feed.id')
      .where('c_feed.category', options.category);
  }

  if (options?.search) {
    dataQuery = dataQuery.where(function () {
      this.where('submissions.caption', 'ilike', `%${options!.search}%`);
    });
  }

  const sortOrder = pagination.sort_order || 'desc';
  const data = await dataQuery
    .orderByRaw(
      `(submissions.wilson_score + COALESCE(submissions.boost_score, 0)) ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    )
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Cross-challenge discover feed sorted by wilson_score.
 * For passive consumption mode (Watch tab).
 * Includes duet parent information where applicable.
 * Optionally filters out blocked users' submissions.
 */
export async function getDiscover(
  pagination: PaginationParams,
  viewerId?: string,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  let baseQuery = db('submissions')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

  if (viewerId) {
    baseQuery = baseQuery.whereNotIn('submissions.user_id', blockedUserIds(viewerId));
  }

  const [{ count }] = await baseQuery.clone().count('submissions.id as count');
  const total = Number(count);

  let dataQuery = db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'challenges.title as challenge_title',
      'challenges.category as challenge_category',
      // Duet parent info
      'duet_parent.id as duet_parent_submission_id',
      'duet_users.username as duet_parent_username',
      db.raw('NULL::text as duet_parent_video_url'),
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .leftJoin('submissions as duet_parent', 'submissions.duet_parent_id', 'duet_parent.id')
    .leftJoin('users as duet_users', 'duet_parent.user_id', 'duet_users.id')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

  if (viewerId) {
    dataQuery = dataQuery.whereNotIn('submissions.user_id', blockedUserIds(viewerId));
  }

  const rows = await dataQuery
    .orderByRaw('submissions.wilson_score DESC')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(rows, total, pagination);
}
