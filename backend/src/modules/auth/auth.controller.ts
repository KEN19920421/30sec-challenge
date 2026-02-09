import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as authService from './auth.service';

/**
 * POST /auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password, username, display_name } = req.body;

    const result = await authService.register({
      email,
      password,
      username,
      display_name,
    });

    res.status(201).json(
      successResponse(result, 'Registration successful'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json(
      successResponse(result, 'Login successful'),
    );
  } catch (err) {
    next(err);
  }
}

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
 * POST /auth/forgot-password
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email);

    // Always return 200 to avoid leaking whether the email exists.
    res.status(200).json(
      successResponse(null, 'If the email exists, a reset link has been sent'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/reset-password
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    res.status(200).json(
      successResponse(null, 'Password has been reset successfully'),
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
 *
 * Placeholder -- in a full implementation this would blacklist the refresh
 * token (e.g., add it to a Redis deny-list) so it can no longer be used.
 */
export async function logout(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: Invalidate the refresh token (add to Redis blacklist)
    res.status(200).json(
      successResponse(null, 'Logged out successfully'),
    );
  } catch (err) {
    next(err);
  }
}
