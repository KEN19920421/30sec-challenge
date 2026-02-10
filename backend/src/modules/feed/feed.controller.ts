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
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 50);
    const data = await feedService.getTrending(limit);
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

    const result = await feedService.getForYou(pagination, { category, search });
    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}
