import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import * as commentService from './comment.service';

/**
 * GET /comments/submission/:submissionId
 */
export async function getSubmissionComments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await commentService.getSubmissionComments(
      req.params.submissionId,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Submission comments retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /comments/:id/replies
 */
export async function getCommentReplies(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await commentService.getCommentReplies(
      req.params.id,
      req.query as Record<string, unknown>,
    );

    res.status(200).json(
      paginatedResponse(result, 'Comment replies retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /comments
 */
export async function createComment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comment = await commentService.createComment(
      req.user!.id,
      req.body,
    );

    res.status(201).json(
      successResponse(comment, 'Comment created successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /comments/:id
 */
export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await commentService.deleteComment(
      req.user!.id,
      req.params.id,
    );

    res.status(200).json(
      successResponse(null, 'Comment deleted successfully'),
    );
  } catch (err) {
    next(err);
  }
}
