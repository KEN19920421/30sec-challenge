import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/types/api-response';
import * as subscriptionService from './subscription.service';

/**
 * GET /subscriptions/plans
 */
export async function getPlans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plans = await subscriptionService.getPlans();

    res.status(200).json(
      successResponse(plans, 'Subscription plans retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/verify
 */
export async function verifyReceipt(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { platform, receipt_data } = req.body;

    const result = await subscriptionService.verifyReceipt(
      req.user!.id,
      platform,
      receipt_data,
    );

    res.status(200).json(
      successResponse(result, 'Receipt verified successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subscriptions/status
 */
export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await subscriptionService.getStatus(req.user!.id);

    res.status(200).json(
      successResponse(status, 'Subscription status retrieved'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/restore
 */
export async function restorePurchases(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { platform, receipt_data } = req.body;

    const result = await subscriptionService.restorePurchases(
      req.user!.id,
      platform,
      receipt_data,
    );

    res.status(200).json(
      successResponse(result, 'Purchases restored successfully'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/cancel/:id
 */
export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const subscription = await subscriptionService.cancelSubscription(
      req.user!.id,
      req.params.id,
    );

    res.status(200).json(
      successResponse(subscription, 'Subscription cancelled'),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/webhook/apple
 */
export async function handleAppleWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await subscriptionService.handleWebhook('apple', req.body);

    // Always return 200 to acknowledge receipt
    res.status(200).json(successResponse(null, 'Webhook processed'));
  } catch (err) {
    // Log but still return 200 to prevent retries for app-level errors
    next(err);
  }
}

/**
 * POST /subscriptions/webhook/google
 */
export async function handleGoogleWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await subscriptionService.handleWebhook('google', req.body);

    res.status(200).json(successResponse(null, 'Webhook processed'));
  } catch (err) {
    next(err);
  }
}
