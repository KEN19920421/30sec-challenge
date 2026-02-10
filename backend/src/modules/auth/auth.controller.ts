import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as authService from './auth.service';

/**
 * POST /auth/social
 */
export async function socialLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider, id_token } = req.body;

    const result = await authService.socialLogin(provider, id_token);

    res.status(200).json(
      successResponse(result, 'Social login successful'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refresh_token } = req.body;

    const tokens = await authService.refreshToken(refresh_token);

    res.status(200).json(
      successResponse(tokens, 'Token refreshed'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.id);

    res.status(200).json(successResponse(user));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await authService.logout(refresh_token);
    }
    res.status(200).json(
      successResponse(null, 'Logged out successfully'),
    );
  } catch (err) {
    next(err);
  }
}
