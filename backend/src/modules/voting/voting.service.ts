import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors';
import { recalculateScore } from './scoring.service';
import { markAsVoted } from './vote-queue.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vote {
  id: string;
  user_id: string;
  submission_id: string;
  challenge_id: string;
  value: 1 | -1;
  is_super_vote: boolean;
  source: string;
  created_at: Date;
}

export interface VoteStats {
  upvotes: number;
  downvotes: number;
  superVotes: number;
  wilsonScore: number;
}

export interface SuperVoteBalance {
  remaining: number;
  maxDaily: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_MAX_SUPER_VOTES_DAILY = 5;
const PRO_FREE_SUPER_VOTES_DAILY = 3;
const LEADERBOARD_KEY_PREFIX = 'leaderboard';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Casts a vote on a submission.
 *
 * Performs full validation, records the vote, updates aggregate counts,
 * recalculates the Wilson Score, marks the queue item, and updates the
 * real-time Redis leaderboard.
 *
 * @param userId       UUID of the voting user
 * @param submissionId UUID of the submission being voted on
 * @param value        +1 for upvote, -1 for downvote
 * @param isSuperVote  Whether this is a super vote
 * @param source       Origin of the vote ('organic', 'rewarded_ad')
 * @returns The created vote record
 */
export async function castVote(
  userId: string,
  submissionId: string,
  value: 1 | -1,
  isSuperVote: boolean = false,
  source: string = 'organic',
): Promise<Vote> {
  // ---- Validate submission exists ----
  const submission = await db('submissions')
    .where('id', submissionId)
    .first('id', 'user_id', 'challenge_id');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // ---- Prevent voting on own submission ----
  if (submission.user_id === userId) {
    throw new ForbiddenError('You cannot vote on your own submission');
  }

  // ---- Check challenge status ----
  const challenge = await db('challenges')
    .where('id', submission.challenge_id)
    .first('id', 'status');

  if (!challenge) {
    throw new NotFoundError('Challenge', submission.challenge_id);
  }

  const allowedStatuses = ['active', 'voting'];
  if (!allowedStatuses.includes(challenge.status)) {
    throw new ValidationError('Validation failed', [
      {
        field: 'challenge_id',
        message: `Voting is not open for this challenge (status: ${challenge.status})`,
      },
    ]);
  }

  // ---- Check for duplicate vote ----
  const existingVote = await db('votes')
    .where({ user_id: userId, submission_id: submissionId })
    .first('id');

  if (existingVote) {
    throw new ValidationError('Validation failed', [
      { field: 'submission_id', message: 'You have already voted on this submission' },
    ]);
  }

  // ---- Super vote validation ----
  if (isSuperVote) {
    const balance = await getSuperVoteBalance(userId);
    if (balance.remaining <= 0) {
      throw new ValidationError('Validation failed', [
        { field: 'is_super_vote', message: 'No super votes remaining today' },
      ]);
    }
  }

  // ---- Insert vote and update counts in a transaction ----
  const vote = await db.transaction(async (trx) => {
    const [newVote] = await trx('votes')
      .insert({
        user_id: userId,
        submission_id: submissionId,
        challenge_id: submission.challenge_id,
        value,
        is_super_vote: isSuperVote,
        source,
      })
      .returning('*');

    // Update aggregate counts on the submission
    const updates: Record<string, unknown> = {
      vote_count: db.raw('vote_count + ?', [value]),
      updated_at: db.fn.now(),
    };

    if (isSuperVote && value === 1) {
      updates.super_vote_count = db.raw('super_vote_count + 1');
    }

    await trx('submissions')
      .where('id', submissionId)
      .update(updates);

    return newVote as Vote;
  });

  // ---- Post-transaction side effects (non-blocking) ----

  // Recalculate Wilson Score
  try {
    const newScore = await recalculateScore(submissionId);

    // Update Redis sorted set for real-time leaderboard
    const redisKey = `${LEADERBOARD_KEY_PREFIX}:${submission.challenge_id}:all_time`;
    await redis.zadd(redisKey, newScore.toString(), submissionId);
  } catch (err) {
    // Log but do not fail the vote -- scores can be recomputed later
    logger.error('Failed to update score or leaderboard after vote', {
      submissionId,
      error: err instanceof Error ? err.message : err,
    });
  }

  // Mark queue item as voted (fire-and-forget)
  markAsVoted(userId, submission.challenge_id, submissionId).catch((err) => {
    logger.error('Failed to mark queue item as voted', {
      userId,
      submissionId,
      error: err instanceof Error ? err.message : err,
    });
  });

  logger.info('Vote cast', {
    userId,
    submissionId,
    challengeId: submission.challenge_id,
    value,
    isSuperVote,
    source,
  });

  return vote;
}

/**
 * Returns aggregate vote statistics for a submission.
 */
export async function getVoteStats(submissionId: string): Promise<VoteStats> {
  const submission = await db('submissions')
    .where('id', submissionId)
    .first('id', 'wilson_score');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  const counts = await db('votes')
    .where('submission_id', submissionId)
    .select(
      db.raw('COUNT(*) FILTER (WHERE value = 1) as upvotes'),
      db.raw('COUNT(*) FILTER (WHERE value = -1) as downvotes'),
      db.raw('COUNT(*) FILTER (WHERE is_super_vote = true) as super_votes'),
    )
    .first();

  return {
    upvotes: parseInt(counts?.upvotes ?? '0', 10),
    downvotes: parseInt(counts?.downvotes ?? '0', 10),
    superVotes: parseInt(counts?.super_votes ?? '0', 10),
    wilsonScore: parseFloat(submission.wilson_score) || 0,
  };
}

/**
 * Returns all votes a user has cast within a specific challenge.
 */
export async function getUserVotesForChallenge(
  userId: string,
  challengeId: string,
): Promise<Vote[]> {
  const votes = await db('votes')
    .where({ user_id: userId, challenge_id: challengeId })
    .orderBy('created_at', 'desc')
    .select('*');

  return votes as Vote[];
}

/**
 * Calculates the remaining super vote balance for a user today.
 *
 * - Free users: earn super votes by watching rewarded ads (max 5/day)
 * - Pro users: 3 free super votes/day + unlimited via rewarded ads
 */
export async function getSuperVoteBalance(userId: string): Promise<SuperVoteBalance> {
  // Determine subscription tier
  const user = await db('users')
    .where('id', userId)
    .first('id', 'subscription_tier');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  const isPro = user.subscription_tier === 'pro';

  // Count super votes already used today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usedResult = await db('votes')
    .where('user_id', userId)
    .where('is_super_vote', true)
    .where('created_at', '>=', todayStart)
    .count('id as count')
    .first();

  const usedToday = parseInt(usedResult?.count as string ?? '0', 10);

  if (isPro) {
    // Pro: 3 free daily + count how many ad-earned super votes are available
    const adResult = await db('ad_events')
      .where('user_id', userId)
      .where('event_type', 'reward_granted')
      .where('reward_type', 'super_vote')
      .where('created_at', '>=', todayStart)
      .count('id as count')
      .first();

    const adEarned = parseInt(adResult?.count as string ?? '0', 10);
    const totalAvailable = PRO_FREE_SUPER_VOTES_DAILY + adEarned;
    const remaining = Math.max(0, totalAvailable - usedToday);

    return {
      remaining,
      maxDaily: PRO_FREE_SUPER_VOTES_DAILY,
      source: 'pro',
    };
  }

  // Free: super votes only from rewarded ads (max 5/day)
  const adResult = await db('ad_events')
    .where('user_id', userId)
    .where('event_type', 'reward_granted')
    .where('reward_type', 'super_vote')
    .where('created_at', '>=', todayStart)
    .count('id as count')
    .first();

  const adEarned = Math.min(
    parseInt(adResult?.count as string ?? '0', 10),
    FREE_MAX_SUPER_VOTES_DAILY,
  );

  const remaining = Math.max(0, adEarned - usedToday);

  return {
    remaining,
    maxDaily: FREE_MAX_SUPER_VOTES_DAILY,
    source: 'free',
  };
}
