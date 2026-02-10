import { Router } from 'express';
import * as controller from './feed.controller';

const router = Router();

/** GET /trending -- top submissions by wilson_score */
router.get('/trending', controller.getTrending);

/** GET /for-you -- paginated feed with optional category/search filters */
router.get('/for-you', controller.getForYou);

export default router;
