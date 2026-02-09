import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as shareController from './share.controller';

const router = Router();

// Protected: requires authentication
router.post('/generate', authenticate, shareController.generateShareUrl);

// Public: no authentication required
router.get('/resolve/:code', shareController.resolveShareUrl);
router.get('/metadata/:submissionId', shareController.getShareMetadata);

export default router;
