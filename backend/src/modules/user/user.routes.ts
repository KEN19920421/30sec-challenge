import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { updateProfileSchema, searchQuerySchema } from './user.validation';
import * as userController from './user.controller';

const router = Router();

// Public / optional-auth routes
router.get('/search', validate(searchQuerySchema, 'query'), userController.searchUsers);
router.get('/:id', optionalAuth, userController.getProfile);
router.get('/:id/submissions', userController.getUserSubmissions);

// Protected routes
router.put('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.delete('/account', authenticate, userController.deleteAccount);

export default router;
