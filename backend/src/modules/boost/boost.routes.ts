import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate, optionalAuth } from '../../middleware/auth';
import {
  purchaseBoostSchema,
  submissionBoostsParamsSchema,
  paginationQuerySchema,
} from './boost.validation';
import * as boostController from './boost.controller';

const router = Router();

// Public routes (optionalAuth enriches response for logged-in users)
router.get('/tiers', optionalAuth, boostController.getTiers);
router.get(
  '/submission/:submissionId',
  validate(submissionBoostsParamsSchema, 'params'),
  boostController.getSubmissionBoosts,
);

// Protected routes
router.post(
  '/purchase',
  authenticate,
  validate(purchaseBoostSchema),
  boostController.purchaseBoost,
);
router.get(
  '/history',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  boostController.getBoostHistory,
);

export default router;
