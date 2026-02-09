import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';
import * as socialService from './social.service';

/**
 * POST /social/follow/:userId
 */
export async function follow(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    await socialService.follow(followerId, userId);

    res.status(201).json(successResponse(null, 'User followed'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /social/follow/:userId
 */
export async function unfollow(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    await socialService.unfollow(followerId, userId);

    res.status(200).json(successResponse(null, 'User unfollowed'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /social/followers/:userId
 */
export async function getFollowers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);

    const result = await socialService.getFollowers(userId, pagination);

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /social/following/:userId
 */
export async function getFollowing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);

    const result = await socialService.getFollowing(userId, pagination);

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /social/block/:userId
 */
export async function block(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const blockerId = req.user!.id;
    const { userId } = req.params;

    await socialService.blockUser(blockerId, userId);

    res.status(201).json(successResponse(null, 'User blocked'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /social/block/:userId
 */
export async function unblock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const blockerId = req.user!.id;
    const { userId } = req.params;

    await socialService.unblockUser(blockerId, userId);

    res.status(200).json(successResponse(null, 'User unblocked'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /social/blocked
 */
export async function getBlocked(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const blockedUsers = await socialService.getBlockedUsers(userId);

    res.status(200).json(successResponse(blockedUsers));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /social/report/user/:userId
 */
export async function reportUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporterId = req.user!.id;
    const { userId } = req.params;
    const { reason, description } = req.body;

    const report = await socialService.reportUser(
      reporterId,
      userId,
      reason,
      description,
    );

    res.status(201).json(successResponse(report, 'Report submitted'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /social/report/submission/:submissionId
 */
export async function reportSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reporterId = req.user!.id;
    const { submissionId } = req.params;
    const { reason, description } = req.body;

    const report = await socialService.reportSubmission(
      reporterId,
      submissionId,
      reason,
      description,
    );

    res.status(201).json(successResponse(report, 'Report submitted'));
  } catch (err) {
    next(err);
  }
}
