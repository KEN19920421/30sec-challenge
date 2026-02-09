import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import * as coinService from './coin.service';

/**
 * GET /coins/balance
 */
export async function getBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const balance = await coinService.getBalance(req.user!.id);

    res.status(200).json(
      successResponse({ balance }, 'Balance retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /coins/packages
 */
export async function getPackages(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const packages = await coinService.getPackages();

    res.status(200).json(
      successResponse(packages, 'Coin packages retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /coins/purchase
 */
export async function purchaseCoins(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { package_id, platform, receipt_data } = req.body;

    const transaction = await coinService.purchaseCoins(
      req.user!.id,
      package_id,
      platform,
      receipt_data,
    );

    res.status(200).json(
      successResponse(transaction, 'Coins purchased successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /coins/history
 */
export async function getTransactionHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await coinService.getTransactionHistory(
      req.user!.id,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Transaction history retrieved'),
    );
  } catch (err) {
    next(err);
  }
}
