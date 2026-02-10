import { db } from '../../config/database';
import { logger } from '../../config/logger';
// NotFoundError available if needed for future use
// import { NotFoundError } from '../../shared/errors';
import type { PaginatedResult } from '../../shared/types/pagination';
import {
  buildPaginatedResult,
  type PaginationParams,
} from '../../shared/types/pagination';
import { wilsonScore } from '../voting/scoring.service';
import * as cache from './leaderboard.cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all_time';

export interface LeaderboardRow {
  rank: number;
  submission_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  vote_count: number;
  super_vote_count: number;
}

export interface UserRankResult {
  rank: number | null;
  score: number;
  totalParticipants: number;
}

export interface TopCreatorRow {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  aggregateScore: number;
  submissionCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a date filter based on the leaderboard period.
 */
function periodStartDate(period: LeaderboardPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'weekly': {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay()); // start of week (Sunday)
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'all_time':
      return null;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Retrieves the leaderboard for a challenge with pagination.
 *
 * Attempts to read from the Redis sorted set first. On cache miss, falls back
 * to a database query and populates the cache for subsequent requests.
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  period: LeaderboardPeriod = 'all_time',
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResult<LeaderboardRow>> {
  const key = cache.leaderboardKey(challengeId, period);
  const start = (page - 1) * limit;
  const stop = start + limit - 1;

  // ---- Try Redis first ----
  const cacheExists = await cache.exists(key);

  if (cacheExists) {
    const [cachedEntries, total] = await Promise.all([
      cache.getLeaderboard(key, start, stop),
      cache.getCount(key),
    ]);

    if (cachedEntries.length > 0) {
      // Hydrate with user data
      const submissionIds = cachedEntries.map((e) => e.memberId);
      const submissions = await db('submissions as s')
        .join('users as u', 's.user_id', 'u.id')
        .whereIn('s.id', submissionIds)
        .select(
          's.id',
          's.user_id',
          's.vote_count',
          's.super_vote_count',
          'u.username',
          'u.display_name',
          'u.avatar_url',
        );

      const submissionMap = new Map(submissions.map((s) => [s.id, s]));

      const data: LeaderboardRow[] = cachedEntries.map((entry) => {
        const sub = submissionMap.get(entry.memberId);
        return {
          rank: entry.rank,
          submission_id: entry.memberId,
          user_id: sub?.user_id ?? '',
          username: sub?.username ?? '',
          display_name: sub?.display_name ?? '',
          avatar_url: sub?.avatar_url ?? null,
          score: entry.score,
          vote_count: sub?.vote_count ?? 0,
          super_vote_count: sub?.super_vote_count ?? 0,
        };
      });

      const params: PaginationParams = { page, limit };
      return buildPaginatedResult(data, total, params);
    }
  }

  // ---- Fallback to database ----
  const query = db('submissions as s')
    .join('users as u', 's.user_id', 'u.id')
    .where('s.challenge_id', challengeId)
    .where('s.moderation_status', 'approved')
    .where('s.transcode_status', 'completed')
    .whereNull('s.deleted_at');

  const dateFilter = periodStartDate(period);
  if (dateFilter) {
    query.where('s.created_at', '>=', dateFilter);
  }

  // Get total count
  const countResult = await query.clone().count('s.id as count').first();
  const total = parseInt(countResult?.count as string ?? '0', 10);

  // Get paginated results
  const rows = await query
    .clone()
    .orderBy('s.wilson_score', 'desc')
    .offset(start)
    .limit(limit)
    .select(
      's.id as submission_id',
      's.user_id',
      's.wilson_score as score',
      's.vote_count',
      's.super_vote_count',
      'u.username',
      'u.display_name',
      'u.avatar_url',
    );

  const data: LeaderboardRow[] = rows.map((row, index) => ({
    rank: start + index + 1,
    submission_id: row.submission_id,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    score: parseFloat(row.score) || 0,
    vote_count: row.vote_count,
    super_vote_count: row.super_vote_count,
  }));

  const params: PaginationParams = { page, limit };
  return buildPaginatedResult(data, total, params);
}

/**
 * Returns the rank, score, and total participants for a specific user
 * within a challenge leaderboard.
 */
export async function getUserRank(
  userId: string,
  challengeId: string,
  period: LeaderboardPeriod = 'all_time',
): Promise<UserRankResult> {
  // Find the user's submission for this challenge
  const submission = await db('submissions')
    .where({ user_id: userId, challenge_id: challengeId, moderation_status: 'approved' })
    .where('transcode_status', 'completed')
    .whereNull('deleted_at')
    .orderBy('wilson_score', 'desc')
    .first('id', 'wilson_score');

  if (!submission) {
    // User has no submission in this challenge
    const totalResult = await db('submissions')
      .where({ challenge_id: challengeId, moderation_status: 'approved' })
      .where('transcode_status', 'completed')
      .whereNull('deleted_at')
      .count('id as count')
      .first();

    return {
      rank: null,
      score: 0,
      totalParticipants: parseInt(totalResult?.count as string ?? '0', 10),
    };
  }

  const key = cache.leaderboardKey(challengeId, period);

  // Try Redis
  const cacheExists = await cache.exists(key);
  if (cacheExists) {
    const [rank, score, total] = await Promise.all([
      cache.getUserRank(key, submission.id),
      cache.getUserScore(key, submission.id),
      cache.getCount(key),
    ]);

    return {
      rank,
      score: score ?? (parseFloat(submission.wilson_score) || 0),
      totalParticipants: total,
    };
  }

  // Fallback: count how many submissions score higher
  const query = db('submissions')
    .where({ challenge_id: challengeId, moderation_status: 'approved' })
    .where('transcode_status', 'completed')
    .whereNull('deleted_at')
    .where('wilson_score', '>', submission.wilson_score);

  const dateFilter = periodStartDate(period);
  if (dateFilter) {
    query.where('created_at', '>=', dateFilter);
  }

  const higherResult = await query.count('id as count').first();
  const higherCount = parseInt(higherResult?.count as string ?? '0', 10);

  const totalResult = await db('submissions')
    .where({ challenge_id: challengeId, moderation_status: 'approved' })
    .where('transcode_status', 'completed')
    .whereNull('deleted_at')
    .count('id as count')
    .first();

  return {
    rank: higherCount + 1,
    score: parseFloat(submission.wilson_score) || 0,
    totalParticipants: parseInt(totalResult?.count as string ?? '0', 10),
  };
}

/**
 * Returns the leaderboard filtered to only users the requesting user follows.
 */
export async function getFriendsLeaderboard(
  userId: string,
  challengeId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResult<LeaderboardRow>> {
  // Get the list of users this user follows
  const followRows = await db('follows')
    .where('follower_id', userId)
    .select('following_id');

  const friendIds = followRows.map((r) => r.following_id);

  // Include the user themselves
  friendIds.push(userId);

  // Query submissions from friends only
  const baseQuery = db('submissions as s')
    .join('users as u', 's.user_id', 'u.id')
    .where('s.challenge_id', challengeId)
    .where('s.moderation_status', 'approved')
    .where('s.transcode_status', 'completed')
    .whereNull('s.deleted_at')
    .whereIn('s.user_id', friendIds);

  const countResult = await baseQuery.clone().count('s.id as count').first();
  const total = parseInt(countResult?.count as string ?? '0', 10);

  const start = (page - 1) * limit;

  const rows = await baseQuery
    .clone()
    .orderBy('s.wilson_score', 'desc')
    .offset(start)
    .limit(limit)
    .select(
      's.id as submission_id',
      's.user_id',
      's.wilson_score as score',
      's.vote_count',
      's.super_vote_count',
      'u.username',
      'u.display_name',
      'u.avatar_url',
    );

  const data: LeaderboardRow[] = rows.map((row, index) => ({
    rank: start + index + 1,
    submission_id: row.submission_id,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    score: parseFloat(row.score) || 0,
    vote_count: row.vote_count,
    super_vote_count: row.super_vote_count,
  }));

  const params: PaginationParams = { page, limit };
  return buildPaginatedResult(data, total, params);
}

/**
 * Full recomputation of a challenge leaderboard.
 *
 * Recalculates Wilson Scores for all approved submissions, stores the results
 * in Redis sorted sets, and persists a snapshot to the database.
 */
export async function computeLeaderboard(challengeId: string): Promise<void> {
  logger.info('Computing leaderboard', { challengeId });

  // Fetch all approved submissions with their vote data
  const submissions = await db('submissions as s')
    .leftJoin('votes as v', 's.id', 'v.submission_id')
    .where('s.challenge_id', challengeId)
    .where('s.moderation_status', 'approved')
    .where('s.transcode_status', 'completed')
    .whereNull('s.deleted_at')
    .groupBy('s.id')
    .select(
      's.id',
      's.user_id',
      db.raw('COUNT(*) FILTER (WHERE v.value = 1) as upvotes'),
      db.raw('COUNT(*) FILTER (WHERE v.value = -1) as downvotes'),
      db.raw('COUNT(*) FILTER (WHERE v.is_super_vote = true AND v.value = 1) as super_votes'),
      db.raw('COUNT(v.id) as total_votes'),
    );

  // Calculate scores and build entries
  const entries: cache.LeaderboardEntry[] = [];
  const updatePromises: Promise<unknown>[] = [];

  for (const sub of submissions) {
    const upvotes = parseInt(sub.upvotes ?? '0', 10);
    const total = parseInt(sub.total_votes ?? '0', 10);
    const superVotes = parseInt(sub.super_votes ?? '0', 10);

    const score = wilsonScore(upvotes, total, superVotes);

    entries.push({ memberId: sub.id, score });

    // Update submission wilson_score in DB
    updatePromises.push(
      db('submissions')
        .where('id', sub.id)
        .update({ wilson_score: score, updated_at: db.fn.now() }),
    );
  }

  await Promise.all(updatePromises);

  // Store in Redis for each period
  const periodNames: LeaderboardPeriod[] = ['daily', 'weekly', 'all_time'];

  for (const period of periodNames) {
    const key = cache.leaderboardKey(challengeId, period);
    const ttl = cache.getTTL(period);
    await cache.setLeaderboard(key, entries, ttl);
  }

  // Persist snapshot
  await db('leaderboard_snapshots').insert({
    challenge_id: challengeId,
    period: 'all_time',
    snapshot_data: JSON.stringify(
      entries
        .sort((a, b) => b.score - a.score)
        .map((e, i) => ({
          rank: i + 1,
          submission_id: e.memberId,
          score: e.score,
        })),
    ),
    created_at: db.fn.now(),
  });

  logger.info('Leaderboard computed and cached', {
    challengeId,
    submissionCount: entries.length,
  });
}

/**
 * Returns the top creators across all challenges for a given period,
 * ranked by their aggregate Wilson Scores.
 */
export async function getTopCreators(
  period: LeaderboardPeriod = 'all_time',
  limit: number = 20,
): Promise<TopCreatorRow[]> {
  const key = cache.topCreatorsKey(period);

  // Try Redis
  const cacheExists = await cache.exists(key);
  if (cacheExists) {
    const cachedEntries = await cache.getLeaderboard(key, 0, limit - 1);

    if (cachedEntries.length > 0) {
      const userIds = cachedEntries.map((e) => e.memberId);
      const users = await db('users')
        .whereIn('id', userIds)
        .select('id', 'username', 'display_name', 'avatar_url');

      const userMap = new Map(users.map((u) => [u.id, u]));

      // Get submission counts
      const countRows = await db('submissions')
        .whereIn('user_id', userIds)
        .where('moderation_status', 'approved')
        .where('transcode_status', 'completed')
        .whereNull('deleted_at')
        .groupBy('user_id')
        .select('user_id', db.raw('COUNT(*) as count'));

      const countMap = new Map(
        countRows.map((r) => [r.user_id, parseInt(r.count, 10)]),
      );

      return cachedEntries.map((entry) => {
        const user = userMap.get(entry.memberId);
        return {
          rank: entry.rank,
          user_id: entry.memberId,
          username: user?.username ?? '',
          display_name: user?.display_name ?? '',
          avatar_url: user?.avatar_url ?? null,
          aggregateScore: entry.score,
          submissionCount: countMap.get(entry.memberId) ?? 0,
        };
      });
    }
  }

  // Fallback to database
  const query = db('submissions as s')
    .join('users as u', 's.user_id', 'u.id')
    .where('s.moderation_status', 'approved')
    .where('s.transcode_status', 'completed')
    .whereNull('s.deleted_at');

  const dateFilter = periodStartDate(period);
  if (dateFilter) {
    query.where('s.created_at', '>=', dateFilter);
  }

  const rows = await query
    .groupBy('s.user_id', 'u.username', 'u.display_name', 'u.avatar_url')
    .orderByRaw('SUM(s.wilson_score) DESC')
    .limit(limit)
    .select(
      's.user_id',
      'u.username',
      'u.display_name',
      'u.avatar_url',
      db.raw('SUM(s.wilson_score) as aggregate_score'),
      db.raw('COUNT(s.id) as submission_count'),
    );

  const data: TopCreatorRow[] = rows.map((row, index) => ({
    rank: index + 1,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    aggregateScore: parseFloat(row.aggregate_score) || 0,
    submissionCount: parseInt(row.submission_count, 10),
  }));

  // Cache the results
  if (data.length > 0) {
    const cacheEntries = data.map((d) => ({
      memberId: d.user_id,
      score: d.aggregateScore,
    }));
    const ttl = cache.getTTL(period);
    await cache.setLeaderboard(key, cacheEntries, ttl);
  }

  return data;
}
