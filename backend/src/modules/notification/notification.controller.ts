import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';
import * as notificationService from './notification.service';
import * as pushService from './push.service';

/**
 * GET /notifications
 */
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);

    const result = await notificationService.getNotifications(userId, pagination);

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /notifications/unread-count
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json(successResponse({ count }));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notifications/:id/read
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await notificationService.markAsRead(userId, id);

    res.status(200).json(successResponse(null, 'Notification marked as read'));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notifications/read-all
 */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json(successResponse(null, 'All notifications marked as read'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /notifications/:id
 */
export async function deleteNotification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await notificationService.deleteNotification(userId, id);

    res.status(200).json(successResponse(null, 'Notification deleted'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /notifications/preferences
 */
export async function getPreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const preferences = await notificationService.getPreferences(userId);

    res.status(200).json(successResponse(preferences));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notifications/preferences
 */
export async function updatePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const preferences = await notificationService.updatePreferences(
      userId,
      req.body,
    );

    res.status(200).json(successResponse(preferences, 'Preferences updated'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications/device
 */
export async function registerDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { token, platform } = req.body;

    await pushService.registerDevice(userId, token, platform);

    res.status(201).json(successResponse(null, 'Device registered'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /notifications/device
 */
export async function unregisterDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    await pushService.unregisterDevice(userId, token);

    res.status(200).json(successResponse(null, 'Device unregistered'));
  } catch (err) {
    next(err);
  }
}
