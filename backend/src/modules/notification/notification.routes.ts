import { Router } from 'express';
import { validate } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import {
  notificationIdSchema,
  updatePreferencesSchema,
  registerDeviceSchema,
  unregisterDeviceSchema,
} from './notification.validation';
import * as notificationController from './notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Notifications CRUD
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put(
  '/read-all',
  notificationController.markAllAsRead,
);
router.put(
  '/:id/read',
  validate(notificationIdSchema, 'params'),
  notificationController.markAsRead,
);
router.delete(
  '/:id',
  validate(notificationIdSchema, 'params'),
  notificationController.deleteNotification,
);

// Preferences
router.get('/preferences', notificationController.getPreferences);
router.put(
  '/preferences',
  validate(updatePreferencesSchema),
  notificationController.updatePreferences,
);

// Device registration
router.post(
  '/device',
  validate(registerDeviceSchema),
  notificationController.registerDevice,
);
router.delete(
  '/device',
  validate(unregisterDeviceSchema),
  notificationController.unregisterDevice,
);

export default router;
