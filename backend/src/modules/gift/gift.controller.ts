import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import * as giftService from './gift.service';

/**
 * GET /gifts/catalog
 */
export async function getCatalog(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const catalog = await giftService.getCatalog();

    res.status(200).json(
      successResponse(catalog, 'Gift catalog retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /gifts/send
 */
export async function sendGift(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { receiver_id, submission_id, gift_id, message } = req.body;

    const transaction = await giftService.sendGift(
      req.user!.id,
      receiver_id,
      submission_id,
      gift_id,
      message,
    );

    res.status(201).json(
      successResponse(transaction, 'Gift sent successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /gifts/received
 */
export async function getReceivedGifts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await giftService.getReceivedGifts(
      req.user!.id,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Received gifts retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /gifts/sent
 */
export async function getSentGifts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await giftService.getSentGifts(
      req.user!.id,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Sent gifts retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /gifts/submission/:submissionId
 */
export async function getSubmissionGifts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await giftService.getSubmissionGifts(
      req.params.submissionId,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Submission gifts retrieved'),
    );
  } catch (err) {
    next(err);
  }
}
