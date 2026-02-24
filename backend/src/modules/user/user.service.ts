import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';
import {
  PaginationParams,
  PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  subscription_tier: string;
  follower_count: number;
  following_count: number;
  submission_count: number;
  is_following?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubmission {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  votes_count: number;
  created_at: Date;
  challenge: {
    id: string;
    title: string;
  } | null;
}

export interface UpdateProfileData {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILE_CACHE_TTL = 300; // 5 minutes
const PROFILE_CACHE_PREFIX = 'user_profile:';

const ANALYTICS_CACHE_TTL = 3600; // 1 hour
const ANALYTICS_CACHE_PREFIX = 'user_analytics:';

const SAFE_USER_COLUMNS = [
  'users.id',
  'users.username',
  'users.email',
  'users.display_name',
  'users.avatar_url',
  'users.bio',
  'users.role',
  'users.subscription_tier',
  'users.follower_count',
  'users.following_count',
  'users.submission_count',
  'users.created_at',
  'users.updated_at',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function profileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

async function invalidateProfileCache(userId: string): Promise<void> {
  await redis.del(profileCacheKey(userId));
}

function analyticsCacheKey(userId: string): string {
  return `${ANALYTICS_CACHE_PREFIX}${userId}`;
}

async function invalidateAnalyticsCache(userId: string): Promise<void> {
  await redis.del(analyticsCacheKey(userId));
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Returns the public profile for a user, optionally including whether
 * the viewer follows them.
 */
export async function getProfile(
  userId: string,
  viewerId?: string,
): Promise<UserProfile> {
  // Try cache first
  const cached = await redis.get(profileCacheKey(userId));
  let profile: UserProfile;

  if (cached) {
    profile = JSON.parse(cached);
  } else {
    const row = await db('users')
      .where('users.id', userId)
      .whereNull('users.deleted_at')
      .select(SAFE_USER_COLUMNS)
      .first();

    if (!row) {
      throw new NotFoundError('User', userId);
    }

    profile = row as UserProfile;

    // Cache the profile (without viewer-specific data)
    await redis.set(
      profileCacheKey(userId),
      JSON.stringify(profile),
      'EX',
      PROFILE_CACHE_TTL,
    );
  }

  // Determine follow status for the viewer
  if (viewerId && viewerId !== userId) {
    const follow = await db('follows')
      .where({ follower_id: viewerId, following_id: userId })
      .first('id');

    profile.is_following = !!follow;
  } else {
    profile.is_following = false;
  }

  return profile;
}

/**
 * Updates the authenticated user's profile fields.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<UserProfile> {
  const updatePayload: Record<string, unknown> = {
    updated_at: db.fn.now(),
  };

  if (data.display_name !== undefined) updatePayload.display_name = data.display_name;
  if (data.bio !== undefined) updatePayload.bio = data.bio;
  if (data.avatar_url !== undefined) updatePayload.avatar_url = data.avatar_url;

  const [updated] = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .update(updatePayload)
    .returning(SAFE_USER_COLUMNS.map((c) => c.replace('users.', '')) as string[]);

  if (!updated) {
    throw new NotFoundError('User', userId);
  }

  await invalidateProfileCache(userId);
  await invalidateAnalyticsCache(userId);

  logger.info('Profile updated', { userId });

  return updated as UserProfile;
}

/**
 * Searches users by username or display_name using ILIKE.
 */
export async function searchUsers(
  query: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<UserProfile>> {
  const offset = paginationToOffset(pagination);
  const searchPattern = `%${query}%`;

  const baseQuery = db('users')
    .whereNull('deleted_at')
    .andWhere(function () {
      this.whereILike('username', searchPattern)
        .orWhereILike('display_name', searchPattern);
    });

  const [{ count }] = await baseQuery.clone().count('* as count');
  const total = Number(count);

  const rows = await baseQuery
    .clone()
    .select(SAFE_USER_COLUMNS.map((c) => c.replace('users.', '')) as string[])
    .orderBy('username', 'asc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(rows as UserProfile[], total, pagination);
}

/**
 * Returns paginated submissions for a given user, including challenge info.
 */
export async function getUserSubmissions(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<UserSubmission>> {
  // Verify user exists
  const userExists = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id');

  if (!userExists) {
    throw new NotFoundError('User', userId);
  }

  const offset = paginationToOffset(pagination);

  const baseQuery = db('submissions').where('submissions.user_id', userId);

  const [{ count }] = await baseQuery.clone().count('* as count');
  const total = Number(count);

  const rows = await baseQuery
    .clone()
    .select(
      'submissions.id',
      'submissions.user_id',
      'submissions.video_url',
      'submissions.thumbnail_url',
      'submissions.caption',
      'submissions.vote_count',
      'submissions.created_at',
      'challenges.id as challenge_id',
      'challenges.title as challenge_title',
    )
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .orderBy('submissions.created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  const submissions: UserSubmission[] = rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    challenge_id: String(row.challenge_id),
    video_url: String(row.video_url),
    thumbnail_url: row.thumbnail_url != null ? String(row.thumbnail_url) : null,
    caption: row.caption != null ? String(row.caption) : null,
    votes_count: Number(row.vote_count),
    created_at: new Date(row.created_at as string),
    challenge: row.challenge_id
      ? { id: String(row.challenge_id), title: String(row.challenge_title) }
      : null,
  }));

  return buildPaginatedResult(submissions, total, pagination);
}

/**
 * Soft-deletes a user account by setting the deleted_at timestamp.
 *
 * Cascade effects (all run in the same DB transaction):
 * - Marks all of the user's submissions as rejected so they no longer appear
 *   in the public feed.
 * - Removes all follow relationships where the user is the follower or the
 *   person being followed.
 * - Removes all votes cast by the user.
 *
 * Both the profile cache and analytics cache are cleared after the transaction
 * commits.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db.transaction(async (trx) => {
    // Soft-delete the user row and anonymize PII data (GDPR)
    const updated = await trx('users')
      .where('id', userId)
      .whereNull('deleted_at')
      .update({
        deleted_at: trx.fn.now(),
        updated_at: trx.fn.now(),
        display_name: '[deleted user]',
        username: `deleted_${userId.slice(0, 8)}`,
        email: `deleted_${userId}@deleted.invalid`,
        avatar_url: null,
        bio: null,
      });

    if (!updated) {
      throw new NotFoundError('User', userId);
    }

    // Hide the user's submissions from the feed by rejecting them
    await trx('submissions')
      .where('user_id', userId)
      .update({ moderation_status: 'rejected' });

    // Remove all follow relationships involving this user
    await trx('follows')
      .where('follower_id', userId)
      .orWhere('following_id', userId)
      .delete();

    // Remove all votes cast by this user
    await trx('votes')
      .where('user_id', userId)
      .delete();
  });

  await invalidateProfileCache(userId);
  await invalidateAnalyticsCache(userId);

  logger.info('Account soft-deleted with cascade', { userId });
}

/**
 * Updates the user's avatar URL.
 */
export async function updateAvatar(
  userId: string,
  avatarUrl: string,
): Promise<UserProfile> {
  return updateProfile(userId, { avatar_url: avatarUrl });
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface UserAchievement {
  id: string;
  key: string;
  name: string;
  name_ja: string | null;
  description: string;
  description_ja: string | null;
  icon_url: string | null;
  category: string;
  tier: string;
  coin_reward: number;
  is_earned: boolean;
  earned_at: string | null;
}

/**
 * Returns all active achievements with earned status for a given user.
 */
export async function getUserAchievements(
  userId: string,
): Promise<UserAchievement[]> {
  // Verify user exists
  const userExists = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id');

  if (!userExists) {
    throw new NotFoundError('User', userId);
  }

  const rows = await db('achievements')
    .leftJoin('user_achievements', function () {
      this.on('achievements.id', '=', 'user_achievements.achievement_id')
        .andOn('user_achievements.user_id', '=', db.raw('?', [userId]));
    })
    .where('achievements.is_active', true)
    .select(
      'achievements.id',
      'achievements.key',
      'achievements.name',
      'achievements.name_ja',
      'achievements.description',
      'achievements.description_ja',
      'achievements.icon_url',
      'achievements.category',
      'achievements.tier',
      'achievements.coin_reward',
      'user_achievements.earned_at',
    )
    .orderBy('achievements.category', 'asc')
    .orderBy('achievements.coin_reward', 'asc');

  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    key: String(row.key),
    name: String(row.name),
    name_ja: String(row.name_ja),
    description: String(row.description),
    description_ja: String(row.description_ja),
    icon_url: row.icon_url != null ? String(row.icon_url) : null,
    category: String(row.category),
    tier: String(row.tier),
    coin_reward: Number(row.coin_reward),
    is_earned: row.earned_at != null,
    earned_at: row.earned_at ? new Date(row.earned_at as string).toISOString() : null,
  }));
}

// ---------------------------------------------------------------------------
// User Analytics
// ---------------------------------------------------------------------------

export interface UserAnalytics {
  totalSubmissions: number;
  totalVotesReceived: number;
  avgVotesPerSubmission: number;
  challengesWon: number;
  totalCoinsEarned: number;
}

/**
 * Returns public analytics stats for any user by ID.
 * Results are cached in Redis for 1 hour (ANALYTICS_CACHE_TTL).
 *
 * @throws NotFoundError if the user does not exist.
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  // Try cache first
  const cacheKey = analyticsCacheKey(userId);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as UserAnalytics;
  }

  const userExists = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .first('id', 'total_coins_earned');

  if (!userExists) {
    throw new NotFoundError('User', userId);
  }

  const [submissionsResult, winsResult] = await Promise.all([
    // Total submissions and total votes received
    db('submissions')
      .where('user_id', userId)
      .whereNull('deleted_at')
      .select(
        db.raw('COUNT(*) as total_submissions'),
        db.raw('COALESCE(SUM(vote_count), 0) as total_votes_received'),
      )
      .first(),

    // Challenges won: count of challenge_winners where user_id = userId
    db('challenge_winners')
      .where('user_id', userId)
      .count('id as count')
      .first(),
  ]);

  const totalSubmissions = Number(submissionsResult?.total_submissions ?? 0);
  const totalVotesReceived = Number(submissionsResult?.total_votes_received ?? 0);
  const avgVotesPerSubmission = totalSubmissions > 0
    ? Math.round((totalVotesReceived / totalSubmissions) * 100) / 100
    : 0;

  const analytics: UserAnalytics = {
    totalSubmissions,
    totalVotesReceived,
    avgVotesPerSubmission,
    challengesWon: Number(winsResult?.count ?? 0),
    totalCoinsEarned: Number(userExists.total_coins_earned ?? 0),
  };

  // Store in cache
  await redis.set(cacheKey, JSON.stringify(analytics), 'EX', ANALYTICS_CACHE_TTL);

  return analytics;
}

/**
 * Generates a presigned URL for avatar upload.
 */
export async function getAvatarUploadUrl(
  userId: string,
): Promise<{ uploadUrl: string; avatarUrl: string }> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
  });

  const key = `avatars/${userId}/${Date.now()}.jpg`;
  const bucket = process.env.S3_BUCKET || '';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: 'image/jpeg',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const cdnBase = process.env.CDN_BASE_URL || process.env.S3_ENDPOINT || '';
  const avatarUrl = `${cdnBase}/${key}`;

  logger.info('Avatar upload URL generated', { userId, key });

  return { uploadUrl, avatarUrl };
}

// ---------------------------------------------------------------------------
// Creator Tier
// ---------------------------------------------------------------------------

export const CREATOR_TIER_REVENUE_SHARE: Record<string, number> = {
  rookie: 50,
  rising: 55,
  partner: 60,
  featured: 65,
};

export type CreatorTier = 'rookie' | 'rising' | 'partner' | 'featured';

interface TierThreshold {
  name: CreatorTier;
  followers: number;
  votes: number;
  months: number;
}

const TIER_THRESHOLDS: TierThreshold[] = [
  { name: 'featured', followers: 10000, votes: 50000, months: 6 },
  { name: 'partner',  followers:  1000, votes:  5000, months: 3 },
  { name: 'rising',   followers:   100, votes:   500, months: 1 },
  { name: 'rookie',   followers:    10, votes:    50, months: 0 },
];

function resolveCreatorTier(
  followers: number,
  votes: number,
  months: number,
): CreatorTier | null {
  for (const threshold of TIER_THRESHOLDS) {
    if (
      followers >= threshold.followers &&
      votes >= threshold.votes &&
      months >= threshold.months
    ) {
      return threshold.name;
    }
  }
  return null;
}

/**
 * Recalculates the creator_tier for every non-deleted user and persists the
 * result.  Intended to be called by a monthly scheduled job.
 *
 * Tier criteria (evaluated top-down; first match wins):
 *   featured : followers >= 10 000  AND total_votes >= 50 000  AND age >= 6 months
 *   partner  : followers >=  1 000  AND total_votes >=  5 000  AND age >= 3 months
 *   rising   : followers >=    100  AND total_votes >=    500  AND age >= 1 month
 *   rookie   : followers >=     10  AND total_votes >=     50
 *   (null)   : does not meet rookie threshold
 */
export async function updateCreatorTiers(): Promise<void> {
  logger.info('Starting creator tier update');

  // Fetch all active users with the columns we need for tier calculation.
  // total_votes_received is derived by summing vote_count on submissions.
  const rows = await db('users')
    .whereNull('deleted_at')
    .select(
      'users.id',
      'users.follower_count',
      'users.created_at',
      db.raw('COALESCE(SUM(s.vote_count), 0) AS total_votes'),
    )
    .leftJoin('submissions as s', function () {
      this.on('s.user_id', '=', 'users.id').andOnNull('s.deleted_at');
    })
    .groupBy('users.id', 'users.follower_count', 'users.created_at');

  const now = new Date();
  let updated = 0;

  for (const row of rows) {
    const followers = Number(row.follower_count ?? 0);
    const votes = Number(row.total_votes ?? 0);
    const createdAt = new Date(row.created_at as string);
    const months =
      (now.getFullYear() - createdAt.getFullYear()) * 12 +
      (now.getMonth() - createdAt.getMonth());

    const tier = resolveCreatorTier(followers, votes, months);

    await db('users')
      .where('id', row.id as string)
      .update({ creator_tier: tier, updated_at: db.fn.now() });

    updated++;
  }

  logger.info('Creator tier update completed', { usersProcessed: updated });
}

export interface CreatorTierInfo {
  creator_tier: CreatorTier | null;
  revenue_share_percentage: number;
  next_tier: CreatorTier | null;
  progress: {
    followers_current: number;
    followers_needed: number;
    votes_current: number;
    votes_needed: number;
  };
}

/**
 * Returns the current creator tier and progress toward the next tier for a
 * given user.
 *
 * @throws NotFoundError if the user does not exist.
 */
export async function getCreatorTierInfo(userId: string): Promise<CreatorTierInfo> {
  // Fetch user and aggregate their total votes received in one query
  const row = await db('users')
    .where('users.id', userId)
    .whereNull('users.deleted_at')
    .select(
      'users.id',
      'users.follower_count',
      'users.creator_tier',
      'users.created_at',
      db.raw('COALESCE(SUM(s.vote_count), 0) AS total_votes'),
    )
    .leftJoin('submissions as s', function () {
      this.on('s.user_id', '=', 'users.id').andOnNull('s.deleted_at');
    })
    .groupBy('users.id', 'users.follower_count', 'users.creator_tier', 'users.created_at')
    .first();

  if (!row) {
    throw new NotFoundError('User', userId);
  }

  const followers = Number(row.follower_count ?? 0);
  const votes = Number(row.total_votes ?? 0);
  const currentTier = (row.creator_tier as CreatorTier | null) ?? null;

  // Determine next tier: the lowest tier whose threshold the user hasn't yet reached
  const nextThreshold = TIER_THRESHOLDS.slice().reverse().find((t) => {
    return followers < t.followers || votes < t.votes;
  }) ?? null;

  const nextTier = nextThreshold ? nextThreshold.name : null;

  const progress = {
    followers_current: followers,
    followers_needed: nextThreshold ? Math.max(0, nextThreshold.followers - followers) : 0,
    votes_current: votes,
    votes_needed: nextThreshold ? Math.max(0, nextThreshold.votes - votes) : 0,
  };

  const revenueShare = currentTier ? (CREATOR_TIER_REVENUE_SHARE[currentTier] ?? 0) : 0;

  return {
    creator_tier: currentTier,
    revenue_share_percentage: revenueShare,
    next_tier: nextTier,
    progress,
  };
}
