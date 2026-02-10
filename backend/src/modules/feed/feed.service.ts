import db from '../../config/database';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

/**
 * Returns trending submissions sorted by wilson_score.
 * Only includes transcoded + approved submissions.
 */
export async function getTrending(
  limit: number = 10,
): Promise<Record<string, unknown>[]> {
  return db('submissions')
    .select(
      'submissions.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at')
    .orderByRaw('(submissions.wilson_score + COALESCE(submissions.boost_score, 0)) DESC')
    .limit(limit);
}

/**
 * Returns a paginated "for-you" feed of submissions.
 * Supports optional category and search filters.
 */
export async function getForYou(
  pagination: PaginationParams,
  options?: { category?: string; search?: string },
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  let baseQuery = db('submissions')
    .where('submissions.transcode_status', 'completed')
    .where('submissions.moderation_status', 'approved')
    .whereNull('submissions.deleted_at');

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
