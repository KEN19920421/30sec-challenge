import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';
import * as adminService from './admin.service';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * GET /admin/dashboard
 */
export async function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json(successResponse(stats));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/**
 * GET /admin/users
 */
export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const filters: adminService.UserFilters = {};

    if (req.query.role) filters.role = req.query.role as string;
    if (req.query.subscription_tier) filters.subscription_tier = req.query.subscription_tier as string;
    if (req.query.is_banned !== undefined) filters.is_banned = req.query.is_banned === 'true';
    if (req.query.search) filters.search = req.query.search as string;

    const result = await adminService.getUsers(pagination, filters);
    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/users/:id/ban
 */
export async function banUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await adminService.banUser(id, reason || 'No reason provided');
    res.status(200).json(successResponse(user, 'User banned'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/users/:id/unban
 */
export async function unbanUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await adminService.unbanUser(id);
    res.status(200).json(successResponse(user, 'User unbanned'));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/**
 * GET /admin/moderation
 */
export async function getModerationQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const result = await adminService.getModerationQueue(pagination);
    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/moderation/:submissionId
 */
export async function moderateSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { submissionId } = req.params;
    const { status, reason } = req.body;

    const submission = await adminService.moderateSubmission(submissionId, {
      status,
      reason,
    });

    res.status(200).json(successResponse(submission, `Submission ${status}`));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * GET /admin/reports
 */
export async function getReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const status = req.query.status as string | undefined;

    const result = await adminService.getReports(pagination, status);
    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/reports/:id/resolve
 */
export async function resolveReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { resolution_note } = req.body;

    const report = await adminService.resolveReport(
      id,
      adminId,
      resolution_note || 'Resolved by admin',
    );

    res.status(200).json(successResponse(report, 'Report resolved'));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * GET /admin/analytics
 */
export async function getAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { start_date, end_date } = req.query as {
      start_date: string;
      end_date: string;
    };

    const data = await adminService.getAnalytics(start_date, end_date);
    res.status(200).json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Challenge management
// ---------------------------------------------------------------------------

/**
 * POST /admin/challenges
 */
export async function createChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challenge = await adminService.createChallenge(req.body);
    res.status(201).json(successResponse(challenge, 'Challenge created'));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /admin/challenges/:id
 */
export async function updateChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const challenge = await adminService.updateChallenge(id, req.body);
    res.status(200).json(successResponse(challenge, 'Challenge updated'));
  } catch (err) {
    next(err);
  }
}
