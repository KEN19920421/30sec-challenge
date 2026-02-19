import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  createCommentSchema,
  commentIdParamsSchema,
  submissionCommentsParamsSchema,
  paginationQuerySchema,
} from './comment.validation';
import * as commentController from './comment.controller';

const router = Router();

// Public routes
router.get(
  '/submission/:submissionId',
  validate(submissionCommentsParamsSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  commentController.getSubmissionComments,
);
router.get(
  '/:id/replies',
  validate(commentIdParamsSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  commentController.getCommentReplies,
);

// Protected routes
router.post('/', authenticate, validate(createCommentSchema), commentController.createComment);
router.delete('/:id', authenticate, validate(commentIdParamsSchema, 'params'), commentController.deleteComment);

export default router;
