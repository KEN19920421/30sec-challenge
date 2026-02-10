import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  socialLoginSchema,
  refreshTokenSchema,
  logoutSchema,
} from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

// Public routes
router.post('/social', validate(socialLoginSchema), authController.socialLogin);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, validate(logoutSchema), authController.logout);

export default router;
