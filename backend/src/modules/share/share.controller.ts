import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as shareService from './share.service';

/**
 * POST /share/generate
 *
 * Generates a short share URL for a submission.
 * Requires authentication.
 */
export async function generateShareUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { submission_id } = req.body;

    const shareUrl = await shareService.generateShareUrl(submission_id);
    res.status(201).json(successResponse(shareUrl, 'Share URL generated'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /share/resolve/:code
 *
 * Resolves a short code to the associated submission.
 * Public endpoint (no authentication required).
 */
export async function resolveShareUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params;

    const submission = await shareService.resolveShareUrl(code);
    res.status(200).json(successResponse(submission));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /share/metadata/:submissionId
 *
 * Returns Open Graph metadata for a submission (used by social media crawlers).
 * Public endpoint (no authentication required).
 */
export async function getShareMetadata(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { submissionId } = req.params;

    const metadata = await shareService.getShareMetadata(submissionId);
    res.status(200).json(successResponse(metadata));
  } catch (err) {
    next(err);
  }
}
