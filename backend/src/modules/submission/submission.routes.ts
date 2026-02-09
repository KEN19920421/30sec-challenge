import { Router } from 'express';
import { authenticate, validate } from '../../middleware';
import * as controller from './submission.controller';
import {
  initiateUploadSchema,
  completeUploadParamSchema,
  submissionIdParamSchema,
  byChallengeParamSchema,
  byUserParamSchema,
  listQuerySchema,
} from './submission.validation';

const router = Router();

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------

/** POST /initiate -- start a new submission upload */
router.post(
  '/initiate',
  authenticate,
  validate(initiateUploadSchema),
  controller.initiateUpload,
);

/** POST /:id/complete -- mark upload as done, trigger transcode */
router.post(
  '/:id/complete',
  authenticate,
  validate(completeUploadParamSchema, 'params'),
  controller.completeUpload,
);

/** DELETE /:id -- soft-delete a submission */
router.delete(
  '/:id',
  authenticate,
  validate(submissionIdParamSchema, 'params'),
  controller.deleteSubmission,
);

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

/** GET /challenge/:challengeId -- paginated submissions for a challenge */
router.get(
  '/challenge/:challengeId',
  validate(byChallengeParamSchema, 'params'),
  validate(listQuerySchema, 'query'),
  controller.getByChallenge,
);

/** GET /user/:userId -- paginated submissions by a user */
router.get(
  '/user/:userId',
  validate(byUserParamSchema, 'params'),
  validate(listQuerySchema, 'query'),
  controller.getByUser,
);

/** GET /:id -- get a single submission */
router.get(
  '/:id',
  validate(submissionIdParamSchema, 'params'),
  controller.getById,
);

export default router;
