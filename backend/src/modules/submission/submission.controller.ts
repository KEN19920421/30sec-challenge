import { Request, Response, NextFunction } from 'express';
import * as submissionService from './submission.service';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// POST /initiate -- start a new submission upload
// ---------------------------------------------------------------------------

export async function initiateUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await submissionService.initiateUpload(userId, req.body);

    res.status(201).json(
      successResponse(
        {
          submission: result.submission,
          upload_url: result.uploadUrl,
        },
        'Upload initiated. Use the upload_url to PUT your video file.',
      ),
    );
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /:id/complete -- mark upload as done, trigger processing
// ---------------------------------------------------------------------------

export async function completeUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const submission = await submissionService.completeUpload(
      userId,
      req.params.id,
    );

    res.json(
      successResponse(submission, 'Upload complete. Video is being processed.'),
    );
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /:id -- get single submission
// ---------------------------------------------------------------------------

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const submission = await submissionService.getById(req.params.id);
    res.json(successResponse(submission));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /challenge/:challengeId -- submissions for a challenge
// ---------------------------------------------------------------------------

export async function getByChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const result = await submissionService.getByChallenge(
      req.params.challengeId,
      pagination,
    );

    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /user/:userId -- submissions by a user
// ---------------------------------------------------------------------------

export async function getByUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const result = await submissionService.getByUser(
      req.params.userId,
      pagination,
    );

    res.json(paginatedResponse(result));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /:id -- soft-delete a submission
// ---------------------------------------------------------------------------

export async function deleteSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await submissionService.deleteSubmission(userId, req.params.id, userRole);

    res.json(successResponse(null, 'Submission deleted'));
  } catch (error) {
    next(error);
  }
}
