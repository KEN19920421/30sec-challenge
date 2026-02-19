import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  socialLoginSchema,
  refreshTokenSchema,
  logoutSchema,
  devLoginSchema,
} from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

// Public routes
router.post('/social', validate(socialLoginSchema), authController.socialLogin);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
// Alias so Flutter's `/auth/refresh-token` also works
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// Dev-only login (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', validate(devLoginSchema), authController.devLogin);
}

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, validate(logoutSchema), authController.logout);

export default router;
