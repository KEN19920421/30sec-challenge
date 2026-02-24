import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors';
import {
  type PaginationParams,
  type PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
} from './challenge.validation';
import { challengeCompletionQueue } from '../../jobs/workers/challenge-completion.worker';

// ---------------------------------------------------------------------------
// Cache keys & TTLs
// ---------------------------------------------------------------------------

const CACHE_KEY_CURRENT = 'challenge:current';
const CACHE_KEY_UPCOMING = 'challenge:upcoming';
const CACHE_TTL_SECONDS = 60; // 1 minute

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function invalidateChallengeCache(): Promise<void> {
  try {
    await redis.del(CACHE_KEY_CURRENT, CACHE_KEY_UPCOMING);
  } catch (error) {
    logger.warn('Failed to invalidate challenge cache', {
      error: (error as Error).message,
    });
  }
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Returns the currently active challenge (status='active', within its
 * starts_at..ends_at window).
 *
 * Returns `null` if no challenge is currently active.
 */
export async function getCurrent(): Promise<Record<string, unknown> | null> {
  // Try cache first
  const cached = await redis.get(CACHE_KEY_CURRENT);
  if (cached) {
    return JSON.parse(cached);
  }

  const now = new Date().toISOString();

  const challenge = await db('challenges')
    .where('status', 'active')
    .whereNot('status', 'draft')
    .where('starts_at', '<=', now)
    .where('ends_at', '>=', now)
    .first();

  if (challenge) {
    // Also attach submission count
    const [{ count }] = await db('submissions')
      .where('challenge_id', challenge.id)
      .whereNull('deleted_at')
      .count('id as count');

    const result = {
      ...challenge,
      submission_count: Number(count),
    };

    await redis.set(CACHE_KEY_CURRENT, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);

    return result;
  }

  return null;
}

/**
 * Retrieves a single challenge by ID.
 *
 * @throws NotFoundError if the challenge does not exist.
 */
export async function getById(id: string): Promise<Record<string, unknown>> {
  const challenge = await db('challenges').where({ id }).first();

  if (!challenge) {
    throw new NotFoundError('Challenge', id);
  }

  // Attach submission count
  const [{ count }] = await db('submissions')
    .where('challenge_id', id)
    .whereNull('deleted_at')
    .count('id as count');

  return {
    ...challenge,
    submission_count: Number(count),
  };
}

/**
 * Returns scheduled (upcoming) challenges.
 *
 * Pro/premium users may see challenges that have `is_pro_early_access = true`
 * and are still within their early-access window.
 *
 * @param userId    Optional authenticated user ID (for access checks).
 * @param userTier  Optional subscription tier of the user.
 */
export async function getUpcoming(
  _userId?: string,
  _userTier?: string,
): Promise<Record<string, unknown>[]> {
  const now = new Date();

  const query = db('challenges')
    .where('status', 'scheduled')
    .whereNot('status', 'draft')
    .where('starts_at', '>', now.toISOString())
    .orderBy('starts_at', 'asc');

  // Early access gating removed — all upcoming challenges are now visible
  // to all users regardless of subscription tier.
  const challenges = await query;

  return challenges;
}

/**
 * Paginated list of completed challenges.
 */
export async function getHistory(
  pagination: PaginationParams,
  category?: string,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const offset = paginationToOffset(pagination);

  let query = db('challenges').where('status', 'completed');

  if (category) {
    query = query.where('category', category);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const ALLOWED_CHALLENGE_SORT_FIELDS = ['created_at', 'updated_at', 'ends_at', 'starts_at', 'title'] as const;
  const challengeSortBy = ALLOWED_CHALLENGE_SORT_FIELDS.includes(pagination.sort_by as typeof ALLOWED_CHALLENGE_SORT_FIELDS[number])
    ? (pagination.sort_by as string)
    : 'ends_at';

  const data = await query
    .orderBy(challengeSortBy, pagination.sort_order || 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Returns ranked submissions for a completed or voting challenge.
 */
export async function getResults(
  challengeId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<Record<string, unknown>>> {
  // Verify challenge exists
  const challenge = await db('challenges').where({ id: challengeId }).first();

  if (!challenge) {
    throw new NotFoundError('Challenge', challengeId);
  }

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
    .orderBy('submissions.vote_count', 'desc')
    .orderBy('submissions.created_at', 'asc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Returns active premium-only challenges.
 * Verifies the requesting user has an active (non-free) subscription.
 *
 * @param userId      The authenticated user's ID.
 * @param pagination  Pagination parameters.
 * @throws ForbiddenError if the user does not have an active subscription.
 */
export async function getPremiumChallenges(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<Record<string, unknown>>> {
  // Verify the user exists and has a paid subscription tier
  const user = await db('users')
    .where({ id: userId })
    .first('id', 'subscription_tier');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  if (!user.subscription_tier || user.subscription_tier === 'free') {
    throw new ForbiddenError(
      'An active subscription is required to access premium challenges',
    );
  }

  const offset = paginationToOffset(pagination);

  const baseQuery = db('challenges')
    .where('is_premium_only', true)
    .where('status', 'active');

  const [{ count }] = await baseQuery.clone().count('id as count');
  const total = Number(count);

  const data = await db('challenges')
    .where('is_premium_only', true)
    .where('status', 'active')
    .orderBy('starts_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  return buildPaginatedResult(data, total, pagination);
}

/**
 * Creates a new challenge (admin only).
 */
export async function create(
  data: CreateChallengeInput,
): Promise<Record<string, unknown>> {
  const [challenge] = await db('challenges')
    .insert({
      ...data,
      status: 'scheduled',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  await invalidateChallengeCache();

  logger.info('Challenge created', { challengeId: challenge.id, title: data.title });

  return challenge;
}

/**
 * Updates an existing challenge (admin only).
 *
 * @throws NotFoundError if the challenge does not exist.
 */
export async function update(
  id: string,
  data: UpdateChallengeInput,
): Promise<Record<string, unknown>> {
  const existing = await db('challenges').where({ id }).first();

  if (!existing) {
    throw new NotFoundError('Challenge', id);
  }

  const [updated] = await db('challenges')
    .where({ id })
    .update({
      ...data,
      updated_at: db.fn.now(),
    })
    .returning('*');

  await invalidateChallengeCache();

  logger.info('Challenge updated', { challengeId: id });

  return updated;
}

/**
 * Activates a scheduled challenge.
 *
 * @throws NotFoundError if the challenge does not exist.
 * @throws ValidationError if the challenge is not in a valid state.
 */
export async function activate(id: string): Promise<Record<string, unknown>> {
  const challenge = await db('challenges').where({ id }).first();

  if (!challenge) {
    throw new NotFoundError('Challenge', id);
  }

  if (challenge.status !== 'scheduled' && challenge.status !== 'draft') {
    throw new ValidationError(
      `Cannot activate challenge with status '${challenge.status}'. Must be 'scheduled' or 'draft'.`,
    );
  }

  const [updated] = await db('challenges')
    .where({ id })
    .update({
      status: 'active',
      updated_at: db.fn.now(),
    })
    .returning('*');

  await invalidateChallengeCache();

  logger.info('Challenge activated', { challengeId: id });

  return updated;
}

/**
 * Deactivates a challenge, transitioning it to 'voting' or 'completed'
 * depending on whether voting_ends_at has passed.
 *
 * @throws NotFoundError if the challenge does not exist.
 * @throws ValidationError if the challenge is not active.
 */
export async function deactivate(id: string): Promise<Record<string, unknown>> {
  const challenge = await db('challenges').where({ id }).first();

  if (!challenge) {
    throw new NotFoundError('Challenge', id);
  }

  if (challenge.status !== 'active') {
    throw new ValidationError(
      `Cannot deactivate challenge with status '${challenge.status}'. Must be 'active'.`,
    );
  }

  const now = new Date();
  const votingEndsAt = new Date(challenge.voting_ends_at);

  // If voting period has already passed, go straight to completed
  const newStatus = now >= votingEndsAt ? 'completed' : 'voting';

  const [updated] = await db('challenges')
    .where({ id })
    .update({
      status: newStatus,
      updated_at: db.fn.now(),
    })
    .returning('*');

  await invalidateChallengeCache();

  // Enqueue challenge completion rewards when status transitions to completed
  if (newStatus === 'completed') {
    await enqueueChallengeCompletion(id);
  }

  logger.info('Challenge deactivated', { challengeId: id, newStatus });

  return updated;
}

/**
 * Enqueues a challenge-completion job to award coins and send notifications.
 */
export async function enqueueChallengeCompletion(challengeId: string): Promise<void> {
  try {
    await challengeCompletionQueue.add(
      'process-completion',
      { challengeId },
      { jobId: `challenge-completion:${challengeId}` },
    );
    logger.info('Challenge completion job enqueued', { challengeId });
  } catch (err) {
    logger.error('Failed to enqueue challenge completion job', {
      challengeId,
      err: (err as Error).message,
    });
  }
}
