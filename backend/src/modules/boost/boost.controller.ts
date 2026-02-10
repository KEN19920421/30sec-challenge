import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import * as boostService from './boost.service';

/**
 * GET /boosts/tiers
 */
export async function getTiers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await boostService.getTiersForUser(req.user?.id);

    res.status(200).json(
      successResponse(result, 'Boost tiers retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /boosts/purchase
 */
export async function purchaseBoost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { submission_id, tier } = req.body;

    const boost = await boostService.purchaseBoost(
      req.user!.id,
      submission_id,
      tier,
    );

    res.status(201).json(
      successResponse(boost, 'Boost purchased successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /boosts/submission/:submissionId
 */
export async function getSubmissionBoosts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const boosts = await boostService.getSubmissionBoosts(
      req.params.submissionId,
    );

    res.status(200).json(
      successResponse(boosts, 'Submission boosts retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /boosts/history
 */
export async function getBoostHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await boostService.getBoostHistory(
      req.user!.id,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Boost history retrieved'),
    );
  } catch (err) {
    next(err);
  }
}
