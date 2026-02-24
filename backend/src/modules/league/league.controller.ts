import type { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { ValidationError } from '../../shared/errors';
import * as leagueService from './league.service';
import type { LeagueTier } from './league.service';
import { parsePaginationParams } from '../../shared/types/pagination';

export async function getMyLeague(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const membership = await leagueService.getMyLeague(userId);
    res.status(200).json(successResponse(membership, 'League membership retrieved'));
  } catch (err) {
    next(err);
  }
}

export async function getCurrentStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await leagueService.getCurrentLeagueStats();
    res.status(200).json(successResponse(stats, 'League stats retrieved'));
  } catch (err) {
    next(err);
  }
}

export async function getTierRankings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tier } = req.params;
    const validTiers: LeagueTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master'];
    if (!validTiers.includes(tier as LeagueTier)) {
      throw new ValidationError(`Invalid tier. Must be one of: ${validTiers.join(', ')}`);
    }

    const week = (req.query['week'] as string) || new Date().toISOString().split('T')[0];
    const pagination = parsePaginationParams(req.query);
    const result = await leagueService.getLeagueRankings(tier as LeagueTier, week, pagination);

    res.status(200).json(paginatedResponse(result, 'League rankings retrieved'));
  } catch (err) {
    next(err);
  }
}

export async function triggerCalculation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { season_week } = req.body as { season_week?: string };
    if (!season_week) {
      throw new ValidationError('season_week is required');
    }
    const result = await leagueService.calculateWeeklyLeague(season_week);
    res.status(200).json(successResponse(result, 'League calculation completed'));
  } catch (err) {
    next(err);
  }
}
