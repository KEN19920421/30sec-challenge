import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ForbiddenError } from '../shared/errors';

/**
 * Middleware that gates access to routes requiring an active (non-free)
 * subscription.
 *
 * **Must** be placed **after** `authenticate` in the middleware chain so
 * that `req.user` is guaranteed to be populated.
 *
 * A user is considered subscribed when their `subscription_tier` is any
 * value other than `'free'`.
 *
 * @example
 * ```ts
 * router.post(
 *   '/challenges',
 *   authenticate,
 *   requireSubscription,
 *   challengeController.create,
 * );
 * ```
 */
export function requireSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AuthenticationError('Authentication required'));
    return;
  }

  if (req.user.subscription_tier === 'free') {
    next(
      new ForbiddenError(
        'An active subscription is required to access this resource',
      ),
    );
    return;
  }

  next();
}
