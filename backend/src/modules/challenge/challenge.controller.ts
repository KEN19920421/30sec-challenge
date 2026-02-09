import { Request, Response, NextFunction } from 'express';
import * as challengeService from './challenge.service';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// GET / -- current active challenge
// ---------------------------------------------------------------------------

export async function getCurrent(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challenge = await challengeService.getCurrent();

    if (!challenge) {
      res.json(successResponse(null, 'No active challenge at this time'));
      return;
    }

    res.json(successResponse(challenge));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /upcoming
// ---------------------------------------------------------------------------

export async function getUpcoming(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userTier = req.user?.subscription_tier;

    const challenges = await challengeService.getUpcoming(userId, userTier);

    res.json(successResponse(challenges));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /history
// ---------------------------------------------------------------------------

export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const category = req.query.category as string | undefined;

    const result = await challengeService.getHistory(pagination, category);

    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /:id
// ---------------------------------------------------------------------------

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challenge = await challengeService.getById(req.params.id);
    res.json(successResponse(challenge));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /:id/results
// ---------------------------------------------------------------------------

export async function getResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const result = await challengeService.getResults(req.params.id, pagination);

    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST / -- create challenge (admin)
// ---------------------------------------------------------------------------

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challenge = await challengeService.create(req.body);
    res.status(201).json(successResponse(challenge, 'Challenge created'));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PUT /:id -- update challenge (admin)
// ---------------------------------------------------------------------------

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challenge = await challengeService.update(req.params.id, req.body);
    res.json(successResponse(challenge, 'Challenge updated'));
  } catch (error) {
    next(error);
  }
}
