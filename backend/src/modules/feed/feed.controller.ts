import { Request, Response, NextFunction } from 'express';
import * as feedService from './feed.service';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';

/**
 * GET /trending -- top submissions by wilson_score.
 */
export async function getTrending(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = isNaN(limitRaw) ? 10 : Math.min(Math.max(1, limitRaw), 50);
    const viewerId = req.user?.id;
    const data = await feedService.getTrending(limit, viewerId);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /for-you -- paginated feed with optional filters.
 */
export async function getForYou(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const viewerId = req.user?.id;

    const result = await feedService.getForYou(pagination, { category, search, viewerId });
    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /discover -- cross-challenge discover feed sorted by wilson_score.
 * Suitable for passive Watch tab consumption.
 */
export async function getDiscoverFeed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const viewerId = req.user?.id;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const result = await feedService.getDiscover(pagination, viewerId);
    res.status(200).json(paginatedResponse(result, 'Discover feed retrieved'));
  } catch (err) {
    next(err);
  }
}
