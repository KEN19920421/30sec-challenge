import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ForbiddenError } from '../shared/errors';

/**
 * Returns middleware that ensures the authenticated user has one of the
 * specified roles.
 *
 * **Must** be placed **after** `authenticate` in the middleware chain so
 * that `req.user` is guaranteed to be populated.
 *
 * @param roles  One or more allowed role strings (e.g. `'admin'`, `'moderator'`).
 *
 * @example
 * ```ts
 * router.delete(
 *   '/users/:id',
 *   authenticate,
 *   requireRole('admin'),
 *   userController.destroy,
 * );
 *
 * router.post(
 *   '/reports/:id/resolve',
 *   authenticate,
 *   requireRole('admin', 'moderator'),
 *   reportController.resolve,
 * );
 * ```
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
}
