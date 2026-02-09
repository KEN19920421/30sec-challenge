import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/require-role';
import * as adminController from './admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);

// Moderation
router.get('/moderation', adminController.getModerationQueue);
router.post('/moderation/:submissionId', adminController.moderateSubmission);

// Reports
router.get('/reports', adminController.getReports);
router.post('/reports/:id/resolve', adminController.resolveReport);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Challenge management
router.post('/challenges', adminController.createChallenge);
router.put('/challenges/:id', adminController.updateChallenge);

export default router;
