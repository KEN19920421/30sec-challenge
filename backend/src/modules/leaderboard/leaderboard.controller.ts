import { Request, Response, NextFunction } from 'express';
import {
  successResponse,
  paginatedResponse,
} from '../../shared/types/api-response';
import * as leaderboardService from './leaderboard.service';
import type { LeaderboardPeriod } from './leaderboard.service';

// ---------------------------------------------------------------------------
// GET /leaderboards/challenge/:challengeId
// ---------------------------------------------------------------------------

/**
 * Returns the leaderboard for a specific challenge.
 * Supports period filtering and pagination via query params.
 */
export async function getChallengeLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { challengeId } = req.params;
    const period = (req.query.period as LeaderboardPeriod) || 'all_time';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20),
    );

    const result = await leaderboardService.getChallengeLeaderboard(
      challengeId,
      period,
      page,
      limit,
    );

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /leaderboards/challenge/:challengeId/me
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's rank within a challenge leaderboard.
 */
export async function getUserRank(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.params;
    const period = (req.query.period as LeaderboardPeriod) || 'all_time';

    const result = await leaderboardService.getUserRank(
      userId,
      challengeId,
      period,
    );

    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /leaderboards/challenge/:challengeId/friends
// ---------------------------------------------------------------------------

/**
 * Returns the leaderboard for a challenge filtered to followed users.
 */
export async function getFriendsLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20),
    );

    const result = await leaderboardService.getFriendsLeaderboard(
      userId,
      challengeId,
      page,
      limit,
    );

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /leaderboards/top-creators
// ---------------------------------------------------------------------------

/**
 * Returns the top creators ranked by aggregate Wilson Scores.
 */
export async function getTopCreators(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const period = (req.query.period as LeaderboardPeriod) || 'all_time';
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20),
    );

    const data = await leaderboardService.getTopCreators(period, limit);

    res.status(200).json(successResponse(data));
  } catch (err) {
    next(err);
  }
}
