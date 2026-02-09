import { db } from '../../config/database';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueueSubmission {
  id: string;
  user_id: string;
  challenge_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  vote_count: number;
  super_vote_count: number;
  wilson_score: number;
  created_at: Date;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle for fair, unbiased randomization.
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Generates a personalized vote queue for a user in a given challenge.
 *
 * The queue contains all approved submissions that the user has not yet voted
 * on, excluding their own submissions and those from blocked users. The order
 * is fully randomized to prevent position bias.
 *
 * If a queue already exists it is replaced with a fresh one.
 *
 * @param userId      UUID of the voting user
 * @param challengeId UUID of the challenge
 */
export async function generateQueue(
  userId: string,
  challengeId: string,
): Promise<void> {
  // Fetch IDs the user has blocked or been blocked by
  const blockedRows = await db('blocked_users')
    .where('blocker_id', userId)
    .orWhere('blocked_id', userId)
    .select('blocker_id', 'blocked_id');

  const blockedUserIds = new Set<string>();
  for (const row of blockedRows) {
    if (row.blocker_id !== userId) blockedUserIds.add(row.blocker_id);
    if (row.blocked_id !== userId) blockedUserIds.add(row.blocked_id);
  }

  // Fetch IDs the user has already voted on for this challenge
  const votedRows = await db('votes')
    .where({ user_id: userId, challenge_id: challengeId })
    .select('submission_id');

  const votedSubmissionIds = new Set(votedRows.map((r) => r.submission_id));

  // Get all approved submissions for the challenge, excluding user's own
  const submissions = await db('submissions')
    .where({ challenge_id: challengeId, moderation_status: 'approved' })
    .whereNot('user_id', userId)
    .select('id', 'user_id');

  // Filter out blocked users and already-voted submissions
  const eligible = submissions.filter(
    (s) => !blockedUserIds.has(s.user_id) && !votedSubmissionIds.has(s.id),
  );

  // Randomize the order
  const randomized = shuffle(eligible);

  // Replace existing queue within a transaction
  await db.transaction(async (trx) => {
    // Remove stale queue entries
    await trx('vote_queue')
      .where({ user_id: userId, challenge_id: challengeId })
      .del();

    if (randomized.length === 0) {
      logger.info('Vote queue generated (empty)', { userId, challengeId });
      return;
    }

    // Insert new queue entries with position numbers
    const rows = randomized.map((s, index) => ({
      user_id: userId,
      challenge_id: challengeId,
      submission_id: s.id,
      position: index + 1,
      is_voted: false,
    }));

    // Batch insert in chunks of 500 to avoid parameter limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await trx('vote_queue').insert(rows.slice(i, i + BATCH_SIZE));
    }
  });

  logger.info('Vote queue generated', {
    userId,
    challengeId,
    count: randomized.length,
  });
}

/**
 * Retrieves the next batch of unvoted submissions from the user's queue.
 *
 * Returns full submission details joined with user profile data, ordered
 * by queue position.
 *
 * @param userId      UUID of the voting user
 * @param challengeId UUID of the challenge
 * @param limit       Maximum number of submissions to return (default 10)
 */
export async function getNextBatch(
  userId: string,
  challengeId: string,
  limit: number = 10,
): Promise<QueueSubmission[]> {
  const rows = await db('vote_queue as vq')
    .join('submissions as s', 'vq.submission_id', 's.id')
    .join('users as u', 's.user_id', 'u.id')
    .where({
      'vq.user_id': userId,
      'vq.challenge_id': challengeId,
      'vq.is_voted': false,
    })
    .where('s.moderation_status', 'approved')
    .orderBy('vq.position', 'asc')
    .limit(limit)
    .select(
      's.id',
      's.user_id',
      's.challenge_id',
      's.video_url',
      's.thumbnail_url',
      's.caption',
      's.vote_count',
      's.super_vote_count',
      's.wilson_score',
      's.created_at',
      'u.username',
      'u.display_name',
      'u.avatar_url',
    );

  return rows as QueueSubmission[];
}

/**
 * Marks a specific submission as voted in the user's queue.
 *
 * @param userId       UUID of the voting user
 * @param challengeId  UUID of the challenge
 * @param submissionId UUID of the submission that was voted on
 */
export async function markAsVoted(
  userId: string,
  challengeId: string,
  submissionId: string,
): Promise<void> {
  await db('vote_queue')
    .where({
      user_id: userId,
      challenge_id: challengeId,
      submission_id: submissionId,
    })
    .update({ is_voted: true });
}
