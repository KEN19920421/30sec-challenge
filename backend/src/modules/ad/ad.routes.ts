import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  logAdEventSchema,
  claimRewardSchema,
  rewardCallbackSchema,
} from './ad.validation';
import * as adController from './ad.controller';

const router = Router();

// Server-to-server callback (no auth -- verified via signature)
router.get('/reward-callback', validate(rewardCallbackSchema, 'query'), adController.verifyRewardCallback);

// Protected routes
router.post('/event', authenticate, validate(logAdEventSchema), adController.logAdEvent);
router.post('/claim-reward', authenticate, validate(claimRewardSchema), adController.claimReward);
router.get('/config', authenticate, adController.getAdConfig);
router.get('/stats', authenticate, adController.getDailyAdStats);

export default router;
