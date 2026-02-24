import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';

export interface LeagueMembership {
  id: string;
  user_id: string;
  tier: LeagueTier;
  season_week: string;
  points: number;
  rank: number | null;
  promoted: boolean;
  relegated: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LeagueMembershipWithUser extends LeagueMembership {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_ORDER: LeagueTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master'];
const PROMOTION_PERCENTILE = 0.2; // Top 20%
const RELEGATION_PERCENTILE = 0.8; // Bottom 20%

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

function leagueCacheKey(userId: string, week: string): string {
  return `league:membership:${userId}:${week}`;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Gets the current league membership for a user.
 * Creates a bronze membership if none exists for this week.
 */
export async function getMyLeague(
  userId: string,
): Promise<LeagueMembership & { username: string; display_name: string; avatar_url: string | null }> {
  const seasonWeek = getMondayOfWeek();
  const cacheKey = leagueCacheKey(userId, seasonWeek);

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as LeagueMembership & {
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  }

  // Get or create membership for current week
  let membership = await db('user_league_memberships')
    .where({ user_id: userId, season_week: seasonWeek })
    .first();

  if (!membership) {
    // Find the user's tier from last week to carry over
    const lastWeek = getMondayOfWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const lastMembership = await db('user_league_memberships')
      .where({ user_id: userId, season_week: lastWeek })
      .first();

    let tier: LeagueTier = 'bronze';
    if (lastMembership) {
      if (lastMembership.promoted) {
        const idx = TIER_ORDER.indexOf(lastMembership.tier as LeagueTier);
        tier = idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : (lastMembership.tier as LeagueTier);
      } else if (lastMembership.relegated) {
        const idx = TIER_ORDER.indexOf(lastMembership.tier as LeagueTier);
        tier = idx > 0 ? TIER_ORDER[idx - 1] : (lastMembership.tier as LeagueTier);
      } else {
        tier = lastMembership.tier as LeagueTier;
      }
    }

    [membership] = await db('user_league_memberships')
      .insert({
        user_id: userId,
        tier,
        season_week: seasonWeek,
        points: 0,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
  }

  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new NotFoundError('User', userId);

  const result = {
    ...(membership as LeagueMembership),
    username: user.username as string,
    display_name: user.display_name as string,
    avatar_url: user.avatar_url as string | null,
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
  return result;
}

/**
 * Gets paginated league rankings for a specific tier and week.
 */
export async function getLeagueRankings(
  tier: LeagueTier,
  seasonWeek: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<LeagueMembershipWithUser>> {
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('user_league_memberships')
    .where({ tier, season_week: seasonWeek })
    .count('id as count');

  const total = Number(count);

  const rows = await db('user_league_memberships')
    .select(
      'user_league_memberships.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
    )
    .leftJoin('users', 'user_league_memberships.user_id', 'users.id')
    .where({ tier, season_week: seasonWeek })
    .orderBy('user_league_memberships.points', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(rows as LeagueMembershipWithUser[], total, pagination);
}

/**
 * Calculates weekly league results and sets promoted/relegated flags.
 * Run at end of each week (Sunday midnight JST = Monday 00:00 JST).
 */
export async function calculateWeeklyLeague(seasonWeek: string): Promise<{ processed: number }> {
  logger.info('Starting weekly league calculation', { seasonWeek });

  let processed = 0;

  for (const tier of TIER_ORDER) {
    const members = await db('user_league_memberships')
      .where({ tier, season_week: seasonWeek })
      .orderBy('points', 'desc');

    if (members.length === 0) continue;

    const promotionCutoff = Math.ceil(members.length * PROMOTION_PERCENTILE);
    const relegationCutoff = Math.floor(members.length * RELEGATION_PERCENTILE);

    await db.transaction(async (trx) => {
      for (let i = 0; i < members.length; i++) {
        const member = members[i] as { id: string };
        const rank = i + 1;
        const promoted = tier !== 'master' && i < promotionCutoff;
        const relegated = tier !== 'bronze' && i >= relegationCutoff;

        await trx('user_league_memberships')
          .where({ id: member.id })
          .update({ rank, promoted, relegated, updated_at: trx.fn.now() });
      }
    });

    processed += members.length;
    logger.info(`Processed ${tier} tier`, { count: members.length });
  }

  return { processed };
}

/**
 * Awards points to a user for the current week.
 * Called after votes, gifts, etc.
 */
export async function awardLeaguePoints(userId: string, points: number): Promise<void> {
  const seasonWeek = getMondayOfWeek();

  await db.raw(
    `
    INSERT INTO user_league_memberships (user_id, tier, season_week, points, created_at, updated_at)
    VALUES (?, 'bronze', ?, ?, now(), now())
    ON CONFLICT (user_id, season_week) DO UPDATE
    SET points = user_league_memberships.points + ?,
        updated_at = now()
  `,
    [userId, seasonWeek, points, points],
  );

  // Invalidate cache
  const cacheKey = leagueCacheKey(userId, seasonWeek);
  await redis.del(cacheKey);
}

/**
 * Returns overall league stats for the current week.
 */
export async function getCurrentLeagueStats(): Promise<Record<string, unknown>> {
  const seasonWeek = getMondayOfWeek();

  const stats = (await db('user_league_memberships')
    .where({ season_week: seasonWeek })
    .select('tier')
    .count('id as count')
    .groupBy('tier')) as Array<{ tier: string; count: string | number }>;

  return {
    season_week: seasonWeek,
    tiers: stats.reduce(
      (acc: Record<string, number>, row) => {
        acc[row.tier] = Number(row.count);
        return acc;
      },
      {},
    ),
  };
}
