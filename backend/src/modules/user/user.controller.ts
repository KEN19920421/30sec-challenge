import { Request, Response, NextFunction } from 'express';
import { successResponse, paginatedResponse } from '../../shared/types/api-response';
import { parsePaginationParams } from '../../shared/types/pagination';
import * as userService from './user.service';

/**
 * GET /users/search
 */
export async function searchUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { q } = req.query as { q: string };
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);

    const result = await userService.searchUsers(q, pagination);

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id
 */
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const viewerId = req.user?.id;

    const profile = await userService.getProfile(id, viewerId);

    res.status(200).json(successResponse(profile));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /users/profile
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    const profile = await userService.updateProfile(userId, req.body);

    res.status(200).json(successResponse(profile, 'Profile updated'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id/submissions
 */
export async function getUserSubmissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);

    const result = await userService.getUserSubmissions(id, pagination);

    res.status(200).json(paginatedResponse(result));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /users/account
 */
export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;

    await userService.deleteAccount(userId);

    res.status(200).json(successResponse(null, 'Account deleted'));
  } catch (err) {
    next(err);
  }
}
