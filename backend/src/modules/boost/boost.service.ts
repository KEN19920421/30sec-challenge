import { db } from '../../config/database';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import {
  parsePaginationParams,
  paginationToOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoostTier {
  tier: string;
  cost: number;
  boostValue: number;
  durationHours: number;
}

interface SubmissionBoost {
  id: string;
  submission_id: string;
  user_id: string;
  tier: string;
  coin_amount: number;
  boost_value: number;
  started_at: Date;
  expires_at: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOST_TIERS: Record<string, BoostTier> = {
  small: { tier: 'small', cost: 50, boostValue: 0.1, durationHours: 12 },
  medium: { tier: 'medium', cost: 200, boostValue: 0.3, durationHours: 24 },
  large: { tier: 'large', cost: 500, boostValue: 0.5, durationHours: 48 },
};

const MAX_BOOST_SCORE = 2.0;

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Returns available boost tiers.
 */
export function getTiers(): BoostTier[] {
  return Object.values(BOOST_TIERS);
}

/**
 * Checks whether the user has ever purchased a boost.
 */
export async function isFirstBoost(userId: string): Promise<boolean> {
  const [{ count }] = await db('submission_boosts')
    .where('user_id', userId)
    .count('id as count');
  return parseInt(count as string, 10) === 0;
}

/**
 * Returns tiers with a flag indicating whether the user qualifies for a free first boost.
 */
export async function getTiersForUser(
  userId?: string,
): Promise<{ tiers: BoostTier[]; firstBoostFree: boolean }> {
  const tiers = Object.values(BOOST_TIERS);
  const firstBoostFree = userId ? await isFirstBoost(userId) : false;
  return { tiers, firstBoostFree };
}

/**
 * Purchases a boost for a submission.
 * Debits coins from the user and creates a boost record.
 */
export async function purchaseBoost(
  userId: string,
  submissionId: string,
  tier: string,
): Promise<SubmissionBoost> {
  const tierConfig = BOOST_TIERS[tier];
  if (!tierConfig) {
    throw new ValidationError('Invalid boost tier', [
      { field: 'tier', message: `Unknown tier: ${tier}` },
    ]);
  }

  // Verify submission exists and is visible
  const submission = await db('submissions')
    .where('id', submissionId)
    .where('transcode_status', 'completed')
    .where('moderation_status', 'approved')
    .whereNull('deleted_at')
    .first();

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // Check if adding this boost would exceed the cap
  const currentBoostScore = parseFloat(submission.boost_score) || 0;
  if (currentBoostScore >= MAX_BOOST_SCORE) {
    throw new ValidationError('Boost limit reached', [
      { field: 'submission_id', message: `Submission has reached the maximum boost score of ${MAX_BOOST_SCORE}` },
    ]);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tierConfig.durationHours * 60 * 60 * 1000);

  // Check if this is the user's first boost and tier is small → free trial
  const firstFree = tier === 'small' && (await isFirstBoost(userId));

  const boost = await db.transaction(async (trx) => {
    // Lock the user row to prevent race conditions on coin balance
    const user = await trx('users')
      .where('id', userId)
      .forUpdate()
      .first('coin_balance', 'total_coins_spent');

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const cost = firstFree ? 0 : tierConfig.cost;

    if (!firstFree && user.coin_balance < tierConfig.cost) {
      throw new ValidationError('Insufficient balance', [
        {
          field: 'tier',
          message: `Insufficient coin balance. Current: ${user.coin_balance}, Required: ${tierConfig.cost}`,
        },
      ]);
    }

    const newBalance = user.coin_balance - cost;

    if (!firstFree) {
      // Debit coins
      await trx('coin_transactions').insert({
        user_id: userId,
        type: 'boost_spent',
        amount: -tierConfig.cost,
        balance_after: newBalance,
        reference_type: 'submission_boost',
        reference_id: submissionId,
        description: `${tier} boost on submission`,
      });

      await trx('users')
        .where('id', userId)
        .update({
          coin_balance: newBalance,
          total_coins_spent: user.total_coins_spent + cost,
          updated_at: trx.fn.now(),
        });
    }

    // Insert boost record
    const [boostRecord] = await trx('submission_boosts')
      .insert({
        submission_id: submissionId,
        user_id: userId,
        tier,
        coin_amount: cost,
        boost_value: tierConfig.boostValue,
        started_at: now,
        expires_at: expiresAt,
      })
      .returning('*');

    // Recalculate boost_score for this submission
    const newScore = await recalculateBoostScore(trx, submissionId);

    // Update submission boost_score (capped at MAX)
    await trx('submissions')
      .where('id', submissionId)
      .update({
        boost_score: Math.min(newScore, MAX_BOOST_SCORE),
        updated_at: trx.fn.now(),
      });

    return boostRecord;
  });

  logger.info('Boost purchased', {
    userId,
    submissionId,
    tier,
    cost: firstFree ? 0 : tierConfig.cost,
    boostValue: tierConfig.boostValue,
    firstBoostFree: firstFree,
  });

  return boost;
}

/**
 * Returns active boosts for a submission.
 */
export async function getSubmissionBoosts(
  submissionId: string,
): Promise<SubmissionBoost[]> {
  const now = new Date();
  return db('submission_boosts')
    .where('submission_id', submissionId)
    .where('expires_at', '>', now.toISOString())
    .orderBy('started_at', 'desc');
}

/**
 * Returns paginated boost history for the authenticated user.
 */
export async function getBoostHistory(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<SubmissionBoost>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('submission_boosts')
    .where('user_id', userId)
    .count('id as count');

  const boosts = await db('submission_boosts')
    .where('user_id', userId)
    .orderBy('started_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select('*');

  return buildPaginatedResult(boosts, parseInt(count as string, 10), pagination);
}

/**
 * Recalculates the boost_score for a submission based on active (non-expired) boosts.
 * Returns the raw sum (caller should cap at MAX_BOOST_SCORE).
 */
export async function recalculateBoostScore(
  trxOrDb: typeof db,
  submissionId: string,
): Promise<number> {
  const now = new Date();

  const result = await trxOrDb('submission_boosts')
    .where('submission_id', submissionId)
    .where('expires_at', '>', now.toISOString())
    .sum('boost_value as total');

  const total = parseFloat((result[0] as any)?.total) || 0;
  return Math.min(total, MAX_BOOST_SCORE);
}

/**
 * Expires stale boosts and recalculates affected submission boost_scores.
 * Called by the maintenance scheduler.
 */
export async function expireBoosts(): Promise<number> {
  const now = new Date();

  // Find submissions that have expired boosts which haven't been cleaned up
  const affectedSubmissions = await db('submission_boosts')
    .select('submission_id')
    .where('expires_at', '<=', now.toISOString())
    .groupBy('submission_id');

  if (affectedSubmissions.length === 0) {
    return 0;
  }

  // Recalculate each affected submission's boost_score
  for (const { submission_id } of affectedSubmissions) {
    const newScore = await recalculateBoostScore(db, submission_id);

    await db('submissions')
      .where('id', submission_id)
      .update({
        boost_score: newScore,
        updated_at: db.fn.now(),
      });
  }

  // Delete the expired boost records
  const deletedCount = await db('submission_boosts')
    .where('expires_at', '<=', now.toISOString())
    .del();

  if (deletedCount > 0) {
    logger.info('Expired boosts cleaned up', {
      submissionsAffected: affectedSubmissions.length,
      boostsDeleted: deletedCount,
    });
  }

  return deletedCount;
}
