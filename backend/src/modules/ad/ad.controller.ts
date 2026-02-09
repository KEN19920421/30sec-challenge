import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as adService from './ad.service';

/**
 * POST /ads/event
 */
export async function logAdEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ad_type, placement, event_type, reward_type, reward_amount } = req.body;

    const event = await adService.logAdEvent(
      req.user!.id,
      ad_type,
      placement,
      event_type,
      reward_type,
      reward_amount,
    );

    res.status(201).json(
      successResponse(event, 'Ad event logged'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ads/reward-callback
 *
 * Server-to-server callback from AdMob. No user authentication required.
 * Verification is done via the AdMob signature in query parameters.
 */
export async function verifyRewardCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adService.verifyRewardCallback(
      req.query as Record<string, string>,
    );

    res.status(200).json(
      successResponse(result, result.message),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ads/claim-reward
 */
export async function claimReward(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ad_type, placement } = req.body;

    const result = await adService.claimReward(
      req.user!.id,
      ad_type,
      placement,
    );

    res.status(200).json(
      successResponse(result, 'Reward claimed successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ads/config
 */
export async function getAdConfig(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const config = await adService.getAdConfig(req.user!.id);

    res.status(200).json(
      successResponse(config, 'Ad configuration retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ads/stats
 */
export async function getDailyAdStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await adService.getDailyAdStats(req.user!.id);

    res.status(200).json(
      successResponse(stats, 'Daily ad stats retrieved'),
    );
  } catch (err) {
    next(err);
  }
}
