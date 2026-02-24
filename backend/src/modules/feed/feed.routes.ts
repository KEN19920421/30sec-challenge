import { Router } from 'express';
import { optionalAuth, validate } from '../../middleware';
import { searchLimiter } from '../../middleware/rate-limiter';
import * as controller from './feed.controller';
import { getTrendingSchema, getForYouSchema } from './feed.validation';

const router = Router();

/** GET /trending -- top submissions by wilson_score */
router.get(
  '/trending',
  searchLimiter,
  optionalAuth,
  validate(getTrendingSchema, 'query'),
  controller.getTrending,
);

/** GET /for-you -- paginated feed with optional category/search filters */
router.get(
  '/for-you',
  searchLimiter,
  optionalAuth,
  validate(getForYouSchema, 'query'),
  controller.getForYou,
);

/** GET /discover -- cross-challenge discover feed sorted by wilson_score */
router.get(
  '/discover',
  searchLimiter,
  optionalAuth,
  controller.getDiscoverFeed,
);

export default router;
