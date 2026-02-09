import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  sendGiftSchema,
  submissionGiftsParamsSchema,
  paginationQuerySchema,
} from './gift.validation';
import * as giftController from './gift.controller';

const router = Router();

// Public routes
router.get('/catalog', giftController.getCatalog);
router.get(
  '/submission/:submissionId',
  validate(submissionGiftsParamsSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  giftController.getSubmissionGifts,
);

// Protected routes
router.post('/send', authenticate, validate(sendGiftSchema), giftController.sendGift);
router.get('/received', authenticate, validate(paginationQuerySchema, 'query'), giftController.getReceivedGifts);
router.get('/sent', authenticate, validate(paginationQuerySchema, 'query'), giftController.getSentGifts);

export default router;
