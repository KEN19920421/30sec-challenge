import { Router } from 'express';
import { authenticate, optionalAuth, validate } from '../../middleware';
import { requireRole } from '../../middleware/require-role';
import * as controller from './challenge.controller';
import {
  createChallengeSchema,
  updateChallengeSchema,
  challengeHistoryQuerySchema,
  challengeResultsQuerySchema,
  challengeIdParamSchema,
} from './challenge.validation';

const router = Router();

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

/** GET / -- get the currently active challenge */
router.get('/', controller.getCurrent);

/** GET /upcoming -- upcoming challenges (optional auth for pro early access) */
router.get(
  '/upcoming',
  optionalAuth,
  controller.getUpcoming,
);

/** GET /history -- paginated completed challenges */
router.get(
  '/history',
  validate(challengeHistoryQuerySchema, 'query'),
  controller.getHistory,
);

/** GET /:id -- single challenge by ID */
router.get(
  '/:id',
  validate(challengeIdParamSchema, 'params'),
  controller.getById,
);

/** GET /:id/results -- ranked submissions for a challenge */
router.get(
  '/:id/results',
  validate(challengeIdParamSchema, 'params'),
  validate(challengeResultsQuerySchema, 'query'),
  controller.getResults,
);

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

/** POST / -- create a new challenge */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createChallengeSchema),
  controller.create,
);

/** PUT /:id -- update an existing challenge */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(challengeIdParamSchema, 'params'),
  validate(updateChallengeSchema),
  controller.update,
);

export default router;
