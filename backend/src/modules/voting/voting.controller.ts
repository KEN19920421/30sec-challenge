import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as votingService from './voting.service';
import * as voteQueueService from './vote-queue.service';

// ---------------------------------------------------------------------------
// GET /voting/queue?challenge_id=X&limit=Y
// ---------------------------------------------------------------------------

/**
 * Returns the next batch of submissions for the authenticated user to vote on.
 * Generates a queue if one does not yet exist.
 */
export async function getVoteQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { challenge_id, limit } = req.query as unknown as {
      challenge_id: string;
      limit: number;
    };

    // Try to fetch existing queue items first
    let batch = await voteQueueService.getNextBatch(userId, challenge_id, limit);

    // If the queue is empty, generate a new one and try again
    if (batch.length === 0) {
      await voteQueueService.generateQueue(userId, challenge_id);
      batch = await voteQueueService.getNextBatch(userId, challenge_id, limit);
    }

    res.status(200).json(
      successResponse(batch, 'Vote queue retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /voting
// ---------------------------------------------------------------------------

/**
 * Records a vote on a submission.
 */
export async function castVote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { submission_id, value, is_super_vote, source } = req.body;

    const vote = await votingService.castVote(
      userId,
      submission_id,
      value,
      is_super_vote,
      source,
    );

    res.status(201).json(
      successResponse(vote, 'Vote recorded'),
    );
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /voting/stats/:submissionId
// ---------------------------------------------------------------------------

/**
 * Returns aggregate vote statistics for a submission.
 */
export async function getVoteStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { submissionId } = req.params;

    const stats = await votingService.getVoteStats(submissionId);

    res.status(200).json(
      successResponse(stats),
    );
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /voting/super-votes/balance
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's remaining super vote balance for today.
 */
export async function getSuperVoteBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const balance = await votingService.getSuperVoteBalance(userId);

    res.status(200).json(
      successResponse(balance),
    );
  } catch (err) {
    next(err);
  }
}
