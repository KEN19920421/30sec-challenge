import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  followParamsSchema,
  blockParamsSchema,
  reportUserSchema,
  reportSubmissionSchema,
  submissionParamsSchema,
} from './social.validation';
import * as socialController from './social.controller';

const router = Router();

// Follow / unfollow
router.post(
  '/follow/:userId',
  authenticate,
  validate(followParamsSchema, 'params'),
  socialController.follow,
);
router.delete(
  '/follow/:userId',
  authenticate,
  validate(followParamsSchema, 'params'),
  socialController.unfollow,
);

// Followers / following lists (public)
router.get('/followers/:userId', socialController.getFollowers);
router.get('/following/:userId', socialController.getFollowing);

// Block / unblock
router.post(
  '/block/:userId',
  authenticate,
  validate(blockParamsSchema, 'params'),
  socialController.block,
);
router.delete(
  '/block/:userId',
  authenticate,
  validate(blockParamsSchema, 'params'),
  socialController.unblock,
);
router.get('/blocked', authenticate, socialController.getBlocked);

// Reports
router.post(
  '/report/user/:userId',
  authenticate,
  validate(followParamsSchema, 'params'),
  validate(reportUserSchema),
  socialController.reportUser,
);
router.post(
  '/report/submission/:submissionId',
  authenticate,
  validate(submissionParamsSchema, 'params'),
  validate(reportSubmissionSchema),
  socialController.reportSubmission,
);

export default router;
