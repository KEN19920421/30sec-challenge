import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import { defaultLimiter, adminLimiter } from '../../middleware/rate-limiter';
import * as leagueController from './league.controller';

const router = Router();

// GET /leagues/me
router.get('/me', defaultLimiter, authenticate, leagueController.getMyLeague);

// GET /leagues/current
router.get('/current', defaultLimiter, leagueController.getCurrentStats);

// GET /leagues/:tier
router.get('/:tier', defaultLimiter, leagueController.getTierRankings);

// POST /leagues/calculate (admin only)
router.post(
  '/calculate',
  adminLimiter,
  authenticate,
  requireRole('admin'),
  leagueController.triggerCalculation,
);

export default router;
