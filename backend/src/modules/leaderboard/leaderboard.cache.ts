import { redis } from '../../config/redis';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/**
 * Builds a Redis key for a challenge leaderboard.
 *
 * Format: `leaderboard:{challengeId}:{period}`
 */
export function leaderboardKey(
  challengeId: string,
  period: 'daily' | 'weekly' | 'all_time' = 'all_time',
): string {
  return `leaderboard:${challengeId}:${period}`;
}

/**
 * Builds a Redis key for the top creators leaderboard.
 *
 * Format: `leaderboard:top_creators:{period}`
 */
export function topCreatorsKey(
  period: 'daily' | 'weekly' | 'all_time' = 'all_time',
): string {
  return `leaderboard:top_creators:${period}`;
}

// ---------------------------------------------------------------------------
// TTL constants (in seconds)
// ---------------------------------------------------------------------------

const TTL_DAILY = 60 * 60;          // 1 hour
const TTL_WEEKLY = 60 * 60 * 4;     // 4 hours
const TTL_ALL_TIME = 60 * 60 * 24;  // 24 hours

/**
 * Returns the appropriate TTL for a given period.
 */
export function getTTL(period: 'daily' | 'weekly' | 'all_time'): number {
  switch (period) {
    case 'daily':
      return TTL_DAILY;
    case 'weekly':
      return TTL_WEEKLY;
    case 'all_time':
      return TTL_ALL_TIME;
  }
}

// ---------------------------------------------------------------------------
// Cache operations
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  memberId: string;
  score: number;
}

/**
 * Stores a complete leaderboard as a Redis sorted set.
 * Replaces any existing data at the key.
 *
 * @param key     Redis key
 * @param entries Array of { memberId, score } entries
 * @param ttl     Time-to-live in seconds (optional)
 */
export async function setLeaderboard(
  key: string,
  entries: LeaderboardEntry[],
  ttl?: number,
): Promise<void> {
  if (entries.length === 0) {
    logger.debug('setLeaderboard called with empty entries, skipping', { key });
    return;
  }

  const pipeline = redis.pipeline();

  // Remove old data
  pipeline.del(key);

  // Build ZADD arguments: score1, member1, score2, member2, ...
  const args: (string | number)[] = [];
  for (const entry of entries) {
    args.push(entry.score, entry.memberId);
  }
  pipeline.zadd(key, ...args.map(String));

  // Set expiry if provided
  if (ttl && ttl > 0) {
    pipeline.expire(key, ttl);
  }

  await pipeline.exec();

  logger.debug('Leaderboard stored in Redis', {
    key,
    count: entries.length,
    ttl,
  });
}

/**
 * Retrieves a range from a sorted set in descending score order.
 * Returns entries with their scores and implicit rank.
 *
 * @param key   Redis key
 * @param start Start index (0-based, inclusive)
 * @param stop  Stop index (0-based, inclusive; use -1 for all)
 * @returns Array of entries with memberId, score, and rank
 */
export async function getLeaderboard(
  key: string,
  start: number,
  stop: number,
): Promise<(LeaderboardEntry & { rank: number })[]> {
  const results = await redis.zrevrange(key, start, stop, 'WITHSCORES');

  if (!results || results.length === 0) return [];

  const entries: (LeaderboardEntry & { rank: number })[] = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({
      memberId: results[i],
      score: parseFloat(results[i + 1]),
      rank: start + i / 2 + 1,
    });
  }

  return entries;
}

/**
 * Gets the rank of a specific member in the sorted set (descending order).
 * Returns null if the member is not found.
 *
 * @param key      Redis key
 * @param memberId The member to look up
 * @returns 1-based rank or null
 */
export async function getUserRank(
  key: string,
  memberId: string,
): Promise<number | null> {
  const rank = await redis.zrevrank(key, memberId);
  return rank !== null ? rank + 1 : null;
}

/**
 * Gets the score of a specific member.
 */
export async function getUserScore(
  key: string,
  memberId: string,
): Promise<number | null> {
  const score = await redis.zscore(key, memberId);
  return score !== null ? parseFloat(score) : null;
}

/**
 * Gets the total number of members in the sorted set.
 */
export async function getCount(key: string): Promise<number> {
  return redis.zcard(key);
}

/**
 * Deletes a leaderboard key from Redis.
 */
export async function invalidate(key: string): Promise<void> {
  await redis.del(key);
  logger.debug('Leaderboard cache invalidated', { key });
}

/**
 * Checks whether a leaderboard key exists in Redis.
 */
export async function exists(key: string): Promise<boolean> {
  const result = await redis.exists(key);
  return result === 1;
}
