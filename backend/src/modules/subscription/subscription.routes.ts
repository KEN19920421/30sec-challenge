import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { verifyReceiptSchema, restoreSchema } from './subscription.validation';
import * as subscriptionController from './subscription.controller';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Webhook routes (no auth -- server-to-server)
router.post('/webhook/apple', subscriptionController.handleAppleWebhook);
router.post('/webhook/google', subscriptionController.handleGoogleWebhook);

// Protected routes
router.post('/verify', authenticate, validate(verifyReceiptSchema), subscriptionController.verifyReceipt);
router.get('/status', authenticate, subscriptionController.getStatus);
router.post('/restore', authenticate, validate(restoreSchema), subscriptionController.restorePurchases);
router.post('/cancel/:id', authenticate, subscriptionController.cancelSubscription);

export default router;
