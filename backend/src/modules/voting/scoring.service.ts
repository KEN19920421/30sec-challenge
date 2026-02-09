import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * z-value for 95% confidence interval (two-tailed).
 */
const Z = 1.96;

/**
 * Super votes are weighted as this many regular votes.
 */
const SUPER_VOTE_WEIGHT = 3;

// ---------------------------------------------------------------------------
// Wilson Score Lower Bound
// ---------------------------------------------------------------------------

/**
 * Calculates the Wilson Score Lower Bound for ranking submissions.
 *
 * The Wilson Score Interval provides a statistically sound way to rank items
 * by positive proportion while accounting for small sample sizes. Items with
 * few votes are naturally ranked lower due to wider confidence intervals.
 *
 * Super votes are weighted as 3 regular votes to reward quality recognition.
 *
 * @param upvotes     Number of upvotes (+1 votes)
 * @param totalVotes  Total number of votes cast (up + down)
 * @param superVotes  Number of super votes already included in upvotes
 * @returns The lower bound of the Wilson Score confidence interval [0, 1]
 */
export function wilsonScore(
  upvotes: number,
  totalVotes: number,
  superVotes: number = 0,
): number {
  if (totalVotes === 0) return 0;

  // Adjust for super vote weighting: each super vote already counted as 1
  // in upvotes and totalVotes, so we add the extra weight.
  const extraWeight = superVotes * (SUPER_VOTE_WEIGHT - 1);
  const adjustedUpvotes = upvotes + extraWeight;
  const adjustedTotal = totalVotes + extraWeight;

  if (adjustedTotal === 0) return 0;

  const phat = adjustedUpvotes / adjustedTotal;
  const n = adjustedTotal;
  const z2 = Z * Z;

  const numerator =
    phat +
    z2 / (2 * n) -
    Z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);

  const denominator = 1 + z2 / n;

  const score = numerator / denominator;

  // Clamp to [0, 1] to handle floating point edge cases
  return Math.max(0, Math.min(1, score));
}

// ---------------------------------------------------------------------------
// Database Integration
// ---------------------------------------------------------------------------

/**
 * Recalculates and persists the Wilson Score for a submission.
 *
 * Reads the current vote counts from the database, computes the new score,
 * and writes it back to the submissions table.
 *
 * @param submissionId  UUID of the submission to recalculate
 * @returns The newly computed Wilson Score
 * @throws NotFoundError if the submission does not exist
 */
export async function recalculateScore(submissionId: string): Promise<number> {
  const submission = await db('submissions')
    .where('id', submissionId)
    .first('id', 'vote_count', 'super_vote_count');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // vote_count tracks net votes; we need upvotes and total.
  // Query actual counts from the votes table for accuracy.
  const counts = await db('votes')
    .where('submission_id', submissionId)
    .select(
      db.raw('COUNT(*) FILTER (WHERE value = 1) as upvotes'),
      db.raw('COUNT(*) FILTER (WHERE value = -1) as downvotes'),
      db.raw('COUNT(*) FILTER (WHERE is_super_vote = true AND value = 1) as super_votes'),
      db.raw('COUNT(*) as total'),
    )
    .first();

  const upvotes = parseInt(counts?.upvotes ?? '0', 10);
  const total = parseInt(counts?.total ?? '0', 10);
  const superVotes = parseInt(counts?.super_votes ?? '0', 10);

  const score = wilsonScore(upvotes, total, superVotes);

  await db('submissions')
    .where('id', submissionId)
    .update({
      wilson_score: score,
      updated_at: db.fn.now(),
    });

  logger.debug('Wilson score recalculated', {
    submissionId,
    upvotes,
    total,
    superVotes,
    score,
  });

  return score;
}
