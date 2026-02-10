import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { purchaseCoinsSchema, transactionHistorySchema } from './coin.validation';
import * as coinController from './coin.controller';

const router = Router();

// Public routes
router.get('/packages', coinController.getPackages);

// Protected routes
router.get('/balance', authenticate, coinController.getBalance);
router.post('/purchase', authenticate, validate(purchaseCoinsSchema), coinController.purchaseCoins);
router.get('/history', authenticate, validate(transactionHistorySchema, 'query'), coinController.getTransactionHistory);

// Daily login reward
router.get('/daily-reward/status', authenticate, coinController.getDailyRewardStatus);
router.post('/daily-reward', authenticate, coinController.claimDailyReward);

export default router;
