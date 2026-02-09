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
  total_submissions: number;
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
  'users.total_submissions',
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
      'submissions.votes_count',
      'submissions.created_at',
      'challenges.id as challenge_id',
      'challenges.title as challenge_title',
    )
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .orderBy('submissions.created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  const submissions: UserSubmission[] = rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    video_url: row.video_url,
    thumbnail_url: row.thumbnail_url,
    caption: row.caption,
    votes_count: row.votes_count,
    created_at: row.created_at,
    challenge: row.challenge_id
      ? { id: row.challenge_id, title: row.challenge_title }
      : null,
  }));

  return buildPaginatedResult(submissions, total, pagination);
}

/**
 * Soft-deletes a user account by setting the deleted_at timestamp.
 * Also clears the profile cache.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const updated = await db('users')
    .where('id', userId)
    .whereNull('deleted_at')
    .update({
      deleted_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

  if (!updated) {
    throw new NotFoundError('User', userId);
  }

  await invalidateProfileCache(userId);

  logger.info('Account soft-deleted', { userId });
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
